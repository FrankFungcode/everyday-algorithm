/*
 * @Author: FrankFungcode combeebe@gmail.com
 * @Date: 2025-11-24 23:03:04
 * @LastEditors: FrankFungcode combeebe@gmail.com
 * @LastEditTime: 2025-11-25 01:31:20
 * @FilePath: \everyday-algorithm\15.1124-leetcode.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * leetcode 111. 二叉树的最小深度
 * https://leetcode.cn/problems/minimum-depth-of-binary-tree/
 * 
给定一个二叉树，找出其最小深度。
最小深度是从根节点到最近叶子节点的最短路径上的节点数量。
说明：叶子节点是指没有子节点的节点。

示例 1：
输入：root = [3,9,20,null,null,15,7]
输出：2

示例 2：
输入：root = [2,null,3,null,4,null,5,null,6]
输出：5

提示：
树中节点数的范围在 [0, 105] 内
-1000 <= Node.val <= 1000
 */

/**
 * 
推荐使用 BFS，因为：

找到第一个叶子节点就能返回，效率更高
逻辑清晰，易于理解
适合面试场景

💡 记住核心：最小深度必须到达叶子节点，单侧为空时不能直接返回 1！
 */

var minDepth = function (root) {
  if (!root) return 0;

  const queue = [root];
  let depth = 1;
  let head = 0; // 队头指针

  while (head < queue.length) {
    const levelSize = queue.length - head;

    for (let i = 0; i < levelSize; i++) {
      const node = queue[head++]; // 用指针代替 shift()

      if (!node.left && !node.right) {
        return depth;
      }

      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }

    depth++;
  }
};
/**
 * 复杂度分析
时间复杂度：
空间复杂度：
 */
