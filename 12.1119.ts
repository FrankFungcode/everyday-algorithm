/*
 * @Author: FrankFungcode combeebe@gmail.com
 * @Date: 2025-11-24 23:02:14
 * @LastEditors: FrankFungcode combeebe@gmail.com
 * @LastEditTime: 2025-11-25 00:43:14
 * @FilePath: \everyday-algorithm\12.1119.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

// 使用JavaScript/TypeScript实现树的深度优先遍历和广度优先遍历~

// 树的 深度优先遍历(DFS) 和 广度优先遍历(BFS)

// 树节点类型定义
class TreeNode<T> {
  value: T;
  children: TreeNode<T>[];

  constructor(value: T) {
    this.value = value;
    this.children = [];
  }

  addChild(child: TreeNode<T>): void {
    this.children.push(child);
  }
}

// 深度优先遍历(DFS)
function dfsRecursive<T>(
  node: TreeNode<T> | null,
  callback: (value: T) => void
): void {
  if (!node) return;

  // 访问当前节点
  callback(node.value);

  // 递归遍历所有子节点
  for (const child of node.children) {
    dfsRecursive(child, callback);
  }
}

// 广度优先遍历(BFS)
function bfs<T>(root: TreeNode<T> | null, callback: (value: T) => void): void {
  if (!root) return;

  const queue: TreeNode<T>[] = [root];

  while (queue.length > 0) {
    const node = queue.shift()!;
    callback(node.value);

    // 将所有子节点加入队列
    for (const child of node.children) {
      queue.push(child);
    }
  }
}
