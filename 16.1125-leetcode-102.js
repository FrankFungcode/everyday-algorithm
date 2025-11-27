/*
 * @Author: FrankFungcode combeebe@gmail.com
 * @Date: 2025-11-27 11:04:31
 * @LastEditors: FrankFungcode combeebe@gmail.com
 * @LastEditTime: 2025-11-27 14:06:33
 * @FilePath: \everyday-algorithm\16.1125-leetcode-102.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

/**
 * leetcode 102. 二叉树的层序遍历
 * https://leetcode.cn/problems/binary-tree-level-order-traversal/
 * 
给你二叉树的根节点 root ，返回其节点值的 层序遍历 。 （即逐层地，从左到右访问所有节点）。

示例 1：
输入：root = [3,9,20,null,null,15,7]
输出：[[3],[9,20],[15,7]]

示例 2：
输入：root = [1]
输出：[[1]]
示例 3：

输入：root = []
输出：[]
 

提示：
树中节点数目在范围 [0, 2000] 内
-1000 <= Node.val <= 1000
 */

/**
 * Definition for a binary tree node.
 * function TreeNode(val, left, right) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.left = (left===undefined ? null : left)
 *     this.right = (right===undefined ? null : right)
 * }
 */
/**
 * @param {TreeNode} root
 * @return {number[][]}
 */
var levelOrder = function (root) {
  // 层序遍历的核心是广度优先搜索（BFS），使用队列来实现
  if (!root) return [];

  const result = [];
  const queue = [root];

  while (queue.length > 0) {
    const levelSize = queue.length; // 当前层的节点数
    const currentLevel = [];

    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift(); // 出队 O(n) 操作，可以用指针优化
      currentLevel.push(node.val);
      if (node.left) queue.push(node.left); // 左子节点入队
      if (node.right) queue.push(node.right); // 右子节点入队
    }
    result.push(currentLevel); // 将当前层的结果加入最终结果
  }
  return result;
};
/**
 * 复杂度分析
时间复杂度：O(n)
空间复杂度：O(n)
 */
