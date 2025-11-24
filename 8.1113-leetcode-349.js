/*
 * @Author: FrankFungcode combeebe@gmail.com
 * @Date: 2025-11-24 22:58:25
 * @LastEditors: FrankFungcode combeebe@gmail.com
 * @LastEditTime: 2025-11-25 00:02:06
 * @FilePath: \everyday-algorithm\6.1111-leetcode.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

/**
 * leetcode 349. 两个数组的交集
 * https://leetcode.cn/problems/intersection-of-two-arrays/
 * 
 * 给定两个数组 nums1 和 nums2 ，返回 它们的 交集 。输出结果中的每个元素一定是 唯一 的。我们可以 不考虑输出结果的顺序 。
   示例 1：
   输入：nums1 = [1,2,2,1], nums2 = [2,2]
   输出：[2]
   
   示例 2：
   输入：nums1 = [4,9,5], nums2 = [9,4,9,8,4]
   输出：[9,4]
   解释：[4,9] 也是可通过的
   
   提示：
   1 <= nums1.length, nums2.length <= 1000
   0 <= nums1[i], nums2[i] <= 1000
 */

/**
 * @param {number[]} nums1
 * @param {number[]} nums2
 * @return {number[]}
 */
var intersection = function (nums1, nums2) {
  const set1 = new Set(nums1);
  const set2 = new Set(nums2);
  return [...set1].filter((num) => set2.has(num));
};

/**
 * 复杂度分析

时间复杂度: O(m + n)
m 是 nums1 的长度，n 是 nums2 的长度
创建 Set: O(m)
遍历并查找: O(n)


空间复杂度: O(m + k)
m 用于存储 set1
k 是交集元素个数（最坏情况 k = min(m, n)
 */
