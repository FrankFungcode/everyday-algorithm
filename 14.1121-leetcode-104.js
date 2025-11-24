/*
 * @Author: FrankFungcode combeebe@gmail.com
 * @Date: 2025-11-24 23:02:40
 * @LastEditors: FrankFungcode combeebe@gmail.com
 * @LastEditTime: 2025-11-25 01:16:37
 * @FilePath: \everyday-algorithm\14.1121-leetcode-104.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * leetcode 104. 二叉树的最大深度 (禁止使用递归)
 * https://leetcode.cn/problems/maximum-depth-of-binary-tree/
 * 给定一个二叉树 root ，返回其最大深度。

   二叉树的 最大深度 是指从根节点到最远叶子节点的最长路径上的节点数。
   示例 1：
   输入：root = [3,9,20,null,null,15,7]
   输出：3
   
   示例 2：
   输入：root = [1,null,2]
   输出：2
   
   提示：
   树中节点的数量在 [0, 104] 区间内。
   -100 <= Node.val <= 100
 */

/**
 * Definition for a binary tree node.
  function TreeNode(val, left, right) {
      this.val = (val===undefined ? 0 : val)
      this.left = (left===undefined ? null : left)
      this.right = (right===undefined ? null : right)
  }
 */
/**
 * @param {TreeNode} root
 * @return {number}
 */
// BFS 广度优先遍历
var maxDepth = function (root) {
  // 边界情况：空树深度为0
  if (root === null) {
    return 0;
  }

  // 初始化队列和深度
  const queue = [root];
  let depth = 0;

  // 层序遍历
  while (queue.length > 0) {
    // 当前层的节点数量
    const levelSize = queue.length;

    // 处理当前层的所有节点
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift();

      // 将下一层的节点加入队列
      if (node.left !== null) {
        queue.push(node.left);
      }
      if (node.right !== null) {
        queue.push(node.right);
      }
    }

    // 处理完一层，深度+1
    depth++;
  }

  return depth;
};

/**
 * 复杂度分析
时间复杂度：O(n)，n为节点总数，每个节点访问一次
空间复杂度：O(w)，w为树的最大宽度（某一层的最大节点数），最坏情况下（完全二叉树最后一层），w ≈ n/2，仍为O(n)
 */
