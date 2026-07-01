#!/bin/bash
# PreToolUse hook: 过滤 Maven 测试输出，只保留关键信息以减少上下文占用
# 适用于后端项目 (nexa-apps)

input=$(cat)
cmd=$(echo "$input" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>{ try{console.log(JSON.parse(d).tool_input.command)}catch(e){console.log('')} })
")

# 匹配 Maven 测试命令
if [[ "$cmd" =~ (mvn.*test|\.\/mvnw.*test|mvnw.*test) ]]; then
  # 改写命令：执行原命令但只保留关键输出
  filtered_cmd="$cmd 2>&1 | grep -E '(Tests run:|BUILD (SUCCESS|FAILURE)|FAIL|ERROR|<<<|Caused by:)' | head -80"
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"allow\",\"updatedInput\":{\"command\":\"$filtered_cmd\"}}}"
# 匹配 Maven 编译命令
elif [[ "$cmd" =~ (mvn.*compile|\.\/mvnw.*compile|mvnw.*compile) ]]; then
  filtered_cmd="$cmd 2>&1 | grep -E '(ERROR|BUILD (SUCCESS|FAILURE)|COMPILATION ERROR|error:)' | head -50"
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"allow\",\"updatedInput\":{\"command\":\"$filtered_cmd\"}}}"
else
  echo "{}"
fi
