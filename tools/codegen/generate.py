#!/usr/bin/env python3
"""CRUD 骨架代码生成器。

读取一份 YAML 实体规格（spec），基于 Jinja2 模板一次性生成
Entity / Repo / Param(Create+Update) / Vo(+IdVo+BatchDelete) /
Service(+Impl) / Application(+Impl) / Controller，共 12 个文件，
写入到项目 src/main/java 对应包路径下。

用法：
    pip install -r tools/codegen/requirements.txt
    python tools/codegen/generate.py --spec tools/codegen/example-spec.yaml

设计边界（详见 .claude/skills/crud-generator/SKILL.md）：
生成器只负责"规则能唯一确定答案"的骨架代码——四层架构、命名后缀、
NexaResponse 包装、BaseEntity/BaseRepo 复用等。具体业务规则（如复杂查询、
跨表校验、权限细节）仍需要人工/AI 在生成之后补全。
"""

from __future__ import annotations

import argparse
import pathlib
import sys

import yaml
from jinja2 import Environment, FileSystemLoader, StrictUndefined

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
TEMPLATE_DIR = SCRIPT_DIR / "templates"

# 非 enum 简单类型 -> 是否需要显式 import（java.lang.* 与 String 不需要）
TYPE_IMPORTS = {
    "BigDecimal": "java.math.BigDecimal",
    "LocalDate": "java.time.LocalDate",
    "LocalDateTime": "java.time.LocalDateTime",
    "YearMonth": "java.time.YearMonth",
    "UUID": "java.util.UUID",
}
SIMPLE_TYPES = {
    "String",
    "Integer",
    "Long",
    "BigDecimal",
    "Boolean",
    "LocalDate",
    "LocalDateTime",
    "YearMonth",
    "UUID",
}


def fail(msg: str) -> None:
    print(f"[codegen] 错误：{msg}", file=sys.stderr)
    sys.exit(1)


def cap(name: str) -> str:
    """首字母大写，用于拼方法名（code -> Code，findByCode）。"""
    return name[0].upper() + name[1:] if name else name


def lower_first(name: str) -> str:
    return name[0].lower() + name[1:] if name else name


def load_spec(spec_path: pathlib.Path) -> dict:
    with spec_path.open("r", encoding="utf-8") as f:
        spec = yaml.safe_load(f)
    for required in ("module", "name", "entity", "table", "fields"):
        if required not in spec or spec[required] in (None, ""):
            fail(f"spec 缺少必填字段: {required}")
    if not spec["fields"]:
        fail("spec.fields 不能为空")
    spec.setdefault("basePath", f"/{spec['module']}/{spec['name'].lower()}s")
    spec.setdefault("description", spec["name"])
    spec.setdefault("roles", [])
    spec.setdefault("authBean", None)
    spec.setdefault("voExtendsBaseDto", False)
    spec.setdefault("operations", ["create", "update", "getById", "page", "delete"])
    valid_ops = {"create", "update", "getById", "page", "delete"}
    bad_ops = set(spec["operations"]) - valid_ops
    if bad_ops:
        fail(f"operations 含不支持的值: {bad_ops}（支持: {sorted(valid_ops)}）")
    if spec["roles"] and not spec["authBean"]:
        fail("配置了 roles 但未配置 authBean（@PreAuthorize 需要引用的鉴权 Bean 名）")
    return spec


def resolve_field(field: dict) -> dict:
    field = dict(field)
    ftype = field.get("type")
    if ftype == "enum":
        if not field.get("enumType"):
            fail(f"字段 {field.get('name')} 类型为 enum 但未指定 enumType")
        field["javaType"] = field["enumType"]
        field["isEnum"] = True
    else:
        if ftype not in SIMPLE_TYPES:
            fail(
                f"字段 {field.get('name')} 类型不支持: {ftype}"
                f"（支持: {sorted(SIMPLE_TYPES)} 或 enum）"
            )
        field["javaType"] = ftype
        field["isEnum"] = False
    field["capName"] = cap(field["name"])
    field.setdefault("required", False)
    field.setdefault("unique", False)
    field.setdefault("filterable", False)
    field.setdefault("keywordSearch", False)
    field.setdefault("length", None)
    if field["required"] and not field.get("message"):
        fail(f"字段 {field['name']} required=true 但未提供业务语义化的 message（禁止使用框架默认提示）")
    field["label"] = field_label(field)
    return field


def field_label(field: dict) -> str:
    """字段的中文业务名——用于 @Size 等消息拼接，避免直接暴露英文字段名。

    优先取显式 label；否则尝试从「{label}不能为空」形式的 message 反推；
    都没有时兜底用字段名（生成后建议人工/AI 补上 label）。
    """
    if field.get("label"):
        return field["label"]
    msg = field.get("message") or ""
    if msg.endswith("不能为空"):
        return msg[: -len("不能为空")]
    return field["name"]


def type_import(field: dict, enum_package: str) -> str | None:
    if field["isEnum"]:
        return f"{enum_package}.{field['javaType']}"
    return TYPE_IMPORTS.get(field["javaType"])


def imports_block(imports: set[str] | list[str]) -> str:
    return "\n".join(f"import {i};" for i in sorted(set(imports)))


def render(env: Environment, template_name: str, context: dict) -> str:
    return env.get_template(template_name).render(**context)


def write_file(path: pathlib.Path, content: str, force: bool) -> None:
    if path.exists() and not force:
        fail(f"文件已存在（如需覆盖请加 --force）: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", newline="\n")
    print(f"[codegen] 已生成: {path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="CRUD 骨架代码生成器")
    parser.add_argument("--spec", required=True, help="实体规格 YAML 文件路径")
    parser.add_argument("--out-root", default="src/main/java", help="Java 源码根目录")
    parser.add_argument("--force", action="store_true", help="允许覆盖已存在文件")
    args = parser.parse_args()

    spec_path = pathlib.Path(args.spec)
    if not spec_path.exists():
        fail(f"spec 文件不存在: {spec_path}")
    spec = load_spec(spec_path)

    module = spec["module"]
    name = spec["name"]
    entity = spec["entity"]
    base_package = f"shokz.nexa.apps.{module}"
    enum_package = f"{base_package}.enums"

    fields = [resolve_field(f) for f in spec["fields"]]
    unique_fields = [f for f in fields if f["unique"]]
    filter_fields = [f for f in fields if f["filterable"]]
    keyword_fields = [f for f in fields if f["keywordSearch"]]
    operations = set(spec["operations"])

    repo_var = lower_first(entity) + "Repo"
    service_var = lower_first(name) + "Service"
    app_var = lower_first(name) + "Application"

    pre_authorize_line = ""
    if spec["roles"]:
        roles_literal = ",".join(f"'{r}'" for r in spec["roles"])
        pre_authorize_line = (
            f'@PreAuthorize("@{spec["authBean"]}.hasAnyRole({roles_literal})")'
        )

    env = Environment(
        loader=FileSystemLoader(str(TEMPLATE_DIR)),
        undefined=StrictUndefined,
        trim_blocks=True,
        lstrip_blocks=True,
        keep_trailing_newline=True,
    )

    ctx_base = {
        "module": module,
        "base_package": base_package,
        "name": name,
        "entity": entity,
        "table": spec["table"],
        "description": spec["description"],
        "fields": fields,
        "unique_fields": unique_fields,
        "filter_fields": filter_fields,
        "keyword_fields": keyword_fields,
        "operations": operations,
        "base_path": spec["basePath"],
        "roles": spec["roles"],
        "pre_authorize_line": pre_authorize_line,
        "vo_extends_base_dto": spec["voExtendsBaseDto"],
        "repo_var": repo_var,
        "service_var": service_var,
        "app_var": app_var,
    }

    out_root = pathlib.Path(args.out_root)
    pkg_path = pathlib.Path(*base_package.split("."))

    def w(rel_path: pathlib.Path, template: str, extra_ctx: dict) -> None:
        content = render(env, template, {**ctx_base, **extra_ctx})
        write_file(out_root / pkg_path / rel_path, content, args.force)

    # 1) Entity
    entity_imports = {
        "jakarta.persistence.Column",
        "jakarta.persistence.Entity",
        "jakarta.persistence.Table",
        "lombok.Getter",
        "lombok.Setter",
        "shokz.nexa.apps.core.base.BaseEntity",
    }
    if any(f["isEnum"] for f in fields):
        entity_imports |= {"jakarta.persistence.EnumType", "jakarta.persistence.Enumerated"}
    for f in fields:
        imp = type_import(f, enum_package)
        if imp:
            entity_imports.add(imp)
    w(pathlib.Path("entity") / f"{entity}.java", "entity.java.j2", {"imports_block": imports_block(entity_imports)})

    # 2) Repo
    repo_imports = {
        "org.springframework.stereotype.Repository",
        "shokz.nexa.apps.core.base.BaseRepo",
        f"{base_package}.entity.{entity}",
    }
    if unique_fields:
        repo_imports.add("java.util.Optional")
    for f in unique_fields:
        imp = type_import(f, enum_package)
        if imp:
            repo_imports.add(imp)
    w(
        pathlib.Path("entity") / "repo" / f"{entity}Repo.java",
        "repo.java.j2",
        {"imports_block": imports_block(repo_imports)},
    )

    # 3) Create Param
    if "create" in operations:
        param_imports = {"lombok.Data"}
        if any(f["required"] and f["javaType"] == "String" for f in fields):
            param_imports.add("jakarta.validation.constraints.NotBlank")
        if any(f["required"] and f["javaType"] != "String" for f in fields):
            param_imports.add("jakarta.validation.constraints.NotNull")
        if any(f["length"] and f["javaType"] == "String" for f in fields):
            param_imports.add("jakarta.validation.constraints.Size")
        for f in fields:
            imp = type_import(f, enum_package)
            if imp:
                param_imports.add(imp)
        w(
            pathlib.Path("param") / f"{name}CreateParam.java",
            "param.java.j2",
            {"imports_block": imports_block(param_imports), "partial": False},
        )

    # 4) Update Param
    if "update" in operations:
        param_imports = {"lombok.Data"}
        if any(f["length"] and f["javaType"] == "String" for f in fields):
            param_imports.add("jakarta.validation.constraints.Size")
        for f in fields:
            imp = type_import(f, enum_package)
            if imp:
                param_imports.add(imp)
        w(
            pathlib.Path("param") / f"{name}UpdateParam.java",
            "param.java.j2",
            {"imports_block": imports_block(param_imports), "partial": True},
        )

    # 5) Vo
    vo_imports = {"lombok.Data"}
    if spec["voExtendsBaseDto"]:
        vo_imports.add("shokz.nexa.apps.core.base.BaseDto")
    else:
        vo_imports.add("java.util.UUID")
    for f in fields:
        imp = type_import(f, enum_package)
        if imp:
            vo_imports.add(imp)
    w(pathlib.Path("vo") / f"{name}Vo.java", "vo.java.j2", {"imports_block": imports_block(vo_imports)})

    # 6) IdVo（create 依赖）
    if "create" in operations:
        w(pathlib.Path("vo") / f"{name}IdVo.java", "id_vo.java.j2", {})

    # 7) BatchDelete Param/Vo（delete 依赖）
    if "delete" in operations:
        w(pathlib.Path("param") / f"{name}BatchDeleteParam.java", "batch_delete_param.java.j2", {})
        w(pathlib.Path("vo") / f"{name}BatchDeleteResultVo.java", "batch_delete_result_vo.java.j2", {})

    # 8) Service 接口
    service_imports = set()
    if "create" in operations:
        service_imports |= {f"{base_package}.param.{name}CreateParam", f"{base_package}.vo.{name}IdVo"}
    if "update" in operations:
        service_imports |= {f"{base_package}.param.{name}UpdateParam", "java.util.UUID"}
    if "getById" in operations:
        service_imports |= {f"{base_package}.vo.{name}Vo", "java.util.UUID"}
    if "page" in operations:
        service_imports |= {
            f"{base_package}.vo.{name}Vo",
            "org.springframework.data.domain.Page",
            "org.springframework.data.domain.Pageable",
        }
    if "delete" in operations:
        service_imports |= {"java.util.List", "java.util.UUID"}
    for f in filter_fields:
        imp = type_import(f, enum_package)
        if imp:
            service_imports.add(imp)
    w(
        pathlib.Path("service") / f"{name}Service.java",
        "service.java.j2",
        {"imports_block": imports_block(service_imports)},
    )

    # 9) Service 实现
    impl_imports = {
        "lombok.RequiredArgsConstructor",
        "org.springframework.stereotype.Service",
        f"{base_package}.entity.{entity}",
        f"{base_package}.entity.repo.{entity}Repo",
        f"{base_package}.service.{name}Service",
    }
    if operations & {"create", "update", "delete"}:
        impl_imports.add("org.springframework.transaction.annotation.Transactional")
    if "create" in operations:
        impl_imports |= {
            f"{base_package}.param.{name}CreateParam",
            f"{base_package}.vo.{name}IdVo",
            "org.springframework.transaction.annotation.Transactional",
        }
    if "update" in operations:
        impl_imports |= {f"{base_package}.param.{name}UpdateParam", "java.util.UUID"}
    if "getById" in operations:
        impl_imports |= {f"{base_package}.vo.{name}Vo", "java.util.UUID"}
    if "page" in operations:
        impl_imports |= {
            f"{base_package}.vo.{name}Vo",
            "jakarta.persistence.criteria.Predicate",
            "java.util.ArrayList",
            "java.util.List",
            "org.springframework.data.domain.Page",
            "org.springframework.data.domain.Pageable",
            "org.springframework.data.jpa.domain.Specification",
        }
    if "delete" in operations:
        impl_imports |= {
            "java.util.List",
            "java.util.LinkedHashSet",
            "java.util.Set",
            "java.util.UUID",
            "shokz.nexa.apps.core.exception.ErrorType",
            "shokz.nexa.apps.core.exception.NexaException",
        }
    if unique_fields:
        impl_imports |= {
            "java.util.Optional",
            "java.util.UUID",
            "shokz.nexa.apps.core.exception.ErrorType",
            "shokz.nexa.apps.core.exception.NexaException",
        }
    for f in unique_fields + filter_fields:
        imp = type_import(f, enum_package)
        if imp:
            impl_imports.add(imp)
    if "getById" not in operations and "page" in operations:
        impl_imports.add(f"{base_package}.vo.{name}Vo")
    w(
        pathlib.Path("service") / "impl" / f"{name}ServiceImpl.java",
        "service_impl.java.j2",
        {"imports_block": imports_block(impl_imports)},
    )

    # 10) Application 接口
    app_imports = set()
    if "create" in operations:
        app_imports |= {f"{base_package}.param.{name}CreateParam", f"{base_package}.vo.{name}IdVo"}
    if "update" in operations:
        app_imports |= {f"{base_package}.param.{name}UpdateParam", "java.util.UUID"}
    if "getById" in operations:
        app_imports |= {f"{base_package}.vo.{name}Vo", "java.util.UUID"}
    if "page" in operations:
        app_imports |= {
            f"{base_package}.vo.{name}Vo",
            "shokz.nexa.apps.core.dto.PagedDataDTO",
            "org.springframework.data.domain.Pageable",
        }
    if "delete" in operations:
        app_imports |= {
            f"{base_package}.param.{name}BatchDeleteParam",
            f"{base_package}.vo.{name}BatchDeleteResultVo",
        }
    for f in filter_fields:
        imp = type_import(f, enum_package)
        if imp:
            app_imports.add(imp)
    w(
        pathlib.Path("application") / f"{name}Application.java",
        "application.java.j2",
        {"imports_block": imports_block(app_imports)},
    )

    # 11) Application 实现
    app_impl_imports = {
        "lombok.RequiredArgsConstructor",
        "org.springframework.stereotype.Service",
        "org.springframework.transaction.annotation.Transactional",
        f"{base_package}.application.{name}Application",
        f"{base_package}.service.{name}Service",
    }
    if "create" in operations:
        app_impl_imports |= {f"{base_package}.param.{name}CreateParam", f"{base_package}.vo.{name}IdVo"}
    if "update" in operations:
        app_impl_imports |= {f"{base_package}.param.{name}UpdateParam", "java.util.UUID"}
    if "getById" in operations:
        app_impl_imports |= {f"{base_package}.vo.{name}Vo", "java.util.UUID"}
    if "page" in operations:
        app_impl_imports |= {
            f"{base_package}.vo.{name}Vo",
            "shokz.nexa.apps.core.dto.PagedDataDTO",
            "org.springframework.data.domain.Page",
            "org.springframework.data.domain.Pageable",
        }
    if "delete" in operations:
        app_impl_imports |= {
            f"{base_package}.param.{name}BatchDeleteParam",
            f"{base_package}.vo.{name}BatchDeleteResultVo",
        }
    for f in filter_fields:
        imp = type_import(f, enum_package)
        if imp:
            app_impl_imports.add(imp)
    w(
        pathlib.Path("application") / "impl" / f"{name}ApplicationImpl.java",
        "application_impl.java.j2",
        {"imports_block": imports_block(app_impl_imports)},
    )

    # 12) Controller
    ctrl_imports = {
        "lombok.RequiredArgsConstructor",
        "org.springframework.web.bind.annotation.RequestMapping",
        "org.springframework.web.bind.annotation.RestController",
        "shokz.nexa.apps.core.dto.NexaResponse",
        f"{base_package}.application.{name}Application",
    }
    if spec["roles"]:
        ctrl_imports.add("org.springframework.security.access.prepost.PreAuthorize")
    if "page" in operations:
        ctrl_imports |= {
            f"{base_package}.vo.{name}Vo",
            "shokz.nexa.apps.core.dto.PagedDataDTO",
            "org.springframework.data.domain.Pageable",
            "org.springframework.data.domain.Sort",
            "org.springframework.data.web.PageableDefault",
            "org.springframework.web.bind.annotation.GetMapping",
            "org.springframework.web.bind.annotation.RequestParam",
        }
    if "getById" in operations:
        ctrl_imports |= {
            f"{base_package}.vo.{name}Vo",
            "java.util.UUID",
            "org.springframework.web.bind.annotation.GetMapping",
            "org.springframework.web.bind.annotation.PathVariable",
        }
    if "create" in operations:
        ctrl_imports |= {
            f"{base_package}.param.{name}CreateParam",
            f"{base_package}.vo.{name}IdVo",
            "jakarta.validation.Valid",
            "org.springframework.web.bind.annotation.PostMapping",
            "org.springframework.web.bind.annotation.RequestBody",
        }
    if "update" in operations:
        ctrl_imports |= {
            f"{base_package}.param.{name}UpdateParam",
            "java.util.UUID",
            "jakarta.validation.Valid",
            "org.springframework.web.bind.annotation.PutMapping",
            "org.springframework.web.bind.annotation.PathVariable",
            "org.springframework.web.bind.annotation.RequestBody",
        }
    if "delete" in operations:
        ctrl_imports |= {
            f"{base_package}.param.{name}BatchDeleteParam",
            f"{base_package}.vo.{name}BatchDeleteResultVo",
            "jakarta.validation.Valid",
            "org.springframework.web.bind.annotation.PostMapping",
            "org.springframework.web.bind.annotation.RequestBody",
        }
    for f in filter_fields:
        imp = type_import(f, enum_package)
        if imp:
            ctrl_imports.add(imp)
    w(
        pathlib.Path("controller") / f"{name}Controller.java",
        "controller.java.j2",
        {"imports_block": imports_block(ctrl_imports)},
    )

    print(f"\n[codegen] {name}（{entity}）骨架生成完成。")
    print("[codegen] 以下事项仍需人工/AI 补全（参考 .claude/skills/crud-generator/checklist.md）：")
    print("  1. 若已有同类主数据的 authorizer / 关联删除保护规则，补到 ServiceImpl")
    print("  2. 复核 Param 校验 message 是否业务语义化、Vo 是否需要额外展示字段")
    print("  3. 是否需要 @PreAuthorize（当前未配置 roles/authBean 则不生成守卫）")
    print("  4. 编译验证: ./mvnw compile -q")
    print("  5. 补充/更新对应模块 AGENTS.md（doc-sync-on-change 规则）")


if __name__ == "__main__":
    main()
