/*
 * @Author: FrankFungcode combeebe@gmail.com
 * @Date: 2025-11-27 11:04:31
 * @LastEditors: FrankFungcode combeebe@gmail.com
 * @LastEditTime: 2025-12-01 14:56:52
 * @FilePath: \everyday-algorithm\16.1125-leetcode-102.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

/**
 * 使用JavaScript实现图的深度优先和广度优先遍历
 */

// 深度优先遍历
function dfsMemoization(graph, start) {
  const visited = new Set();
  function dfs(node) {
    if (visited.has(node)) return;
    visited.add(node);
    console.log(node);
    for (const neighbor of graph[node]) {
      dfs(neighbor);
    }
  }
  dfs(start);
}
// 时间负责度: O(V + E)  V表示节点数，E表示边数
// 空间复杂度：O(V)      递归栈和访问集合的空间

// 广度优先遍历
function bfsMemoization(graph, start) {
  const visited = new Set();
  const queue = [];
  queue.push(start);

  while (queue.length > 0) {
    const node = queue.shift();
    if (visited.has(node)) continue;
    visited.add(node);
    console.log(node);

    const neighbors = graph[node].sort();

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }
}
