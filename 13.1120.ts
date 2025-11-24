/*
 * @Author: FrankFungcode combeebe@gmail.com
 * @Date: 2025-11-24 23:02:22
 * @LastEditors: FrankFungcode combeebe@gmail.com
 * @LastEditTime: 2025-11-25 00:51:00
 * @FilePath: \everyday-algorithm\13.1120.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

// 使用JavaScript/TypeScript实现树的先中后序遍历（不能使用递归）~
// 意味着需要使用迭代的方式，通常会使用栈来实现

// 树的 先序遍历(Pre-order) 中序遍历(In-order) 后序遍历(Post-order)

// 定义树节点结构
class TreeRootNode<T> {
  value: T;
  left: TreeRootNode<T> | null;
  right: TreeRootNode<T> | null;

  constructor(value: T) {
    this.value = value;
    this.left = null;
    this.right = null;
  }
}

/**
 * 
先序遍历（Pre-order）：根-左-右
使用栈，先访问根节点
然后将右子节点入栈，再将左子节点入栈
这样出栈时就是先左后右

中序遍历（In-order）：左-根-右
使用栈，持续将左节点入栈
当没有左节点时，弹出栈顶访问
然后转向右节点

后序遍历（Post-order）：左-右-根
这个比较复杂，可以使用两个栈
或者使用一个栈加上标记
另一种思路是：先序遍历是"根-左-右"，如果改成"根-右-左"，然后反转结果，就得到"左-右-根"
 */

// 先序遍历（根-左-右）
function preorderTraversal<T>(root: TreeRootNode<T> | null): T[] {
  if (!root) return [];

  const result: T[] = [];
  const stack: TreeRootNode<T>[] = [root];

  while (stack.length > 0) {
    const node = stack.pop()!;
    result.push(node.value);

    // 先压入右子节点,再压入左子节点
    // 这样出栈时就是先左后右
    if (node.right) stack.push(node.right);
    if (node.left) stack.push(node.left);
  }

  return result;
}

// 中序遍历（左-根-右）
function inorderTraversal<T>(root: TreeRootNode<T> | null): T[] {
  if (!root) return [];

  const result: T[] = [];
  const stack: TreeRootNode<T>[] = [];
  let current: TreeRootNode<T> | null = root;

  while (current || stack.length > 0) {
    // 一直往左走,将所有左节点入栈
    while (current) {
      stack.push(current);
      current = current.left;
    }

    // 弹出栈顶节点并访问
    current = stack.pop()!;
    result.push(current.value);

    // 转向右子树
    current = current.right;
  }

  return result;
}

// 后序遍历（左-右-根）- 方法1: 使用两个栈
function postorderTraversal<T>(root: TreeRootNode<T> | null): T[] {
  if (!root) return [];

  const result: T[] = [];
  const stack1: TreeRootNode<T>[] = [root];
  const stack2: TreeRootNode<T>[] = [];

  // 第一个栈按照 根-右-左 的顺序遍历
  while (stack1.length > 0) {
    const node = stack1.pop()!;
    stack2.push(node);

    // 注意这里是先左后右
    if (node.left) stack1.push(node.left);
    if (node.right) stack1.push(node.right);
  }

  // 第二个栈弹出,得到 左-右-根 的顺序
  while (stack2.length > 0) {
    result.push(stack2.pop()!.value);
  }

  return result;
}

// 后序遍历 - 方法2: 使用一个栈和标记
function postorderTraversal2<T>(root: TreeRootNode<T> | null): T[] {
  if (!root) return [];

  const result: T[] = [];
  const stack: TreeRootNode<T>[] = [root];
  let lastVisited: TreeRootNode<T> | null = null;

  while (stack.length > 0) {
    const current = stack[stack.length - 1];

    // 如果当前节点是叶子节点,或者其子节点已经被访问过
    if (
      (!current.left && !current.right) ||
      (lastVisited &&
        (lastVisited === current.left || lastVisited === current.right))
    ) {
      result.push(current.value);
      lastVisited = stack.pop()!;
    } else {
      // 先压入右子节点,再压入左子节点
      if (current.right) stack.push(current.right);
      if (current.left) stack.push(current.left);
    }
  }

  return result;
}
