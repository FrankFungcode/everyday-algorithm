/*
 * @Author: FrankFungcode combeebe@gmail.com
 * @Date: 2025-11-24 22:58:25
 * @LastEditors: FrankFungcode combeebe@gmail.com
 * @LastEditTime: 2025-11-25 00:24:20
 * @FilePath: \everyday-algorithm\6.1111-leetcode.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

/**
 * leetcode 3. 无重复字符的最长子串
 * https://leetcode.cn/problems/longest-substring-without-repeating-characters/
 * 给定一个字符串 s ，请你找出其中不含有重复字符的 最长 子串 的长度。
 * 
   示例 1:
   输入: s = "abcabcbb"
   输出: 3 
   解释: 因为无重复字符的最长子串是 "abc"，所以其长度为 3。注意 "bca" 和 "cab" 也是正确答案。
   
   示例 2:
   输入: s = "bbbbb"
   输出: 1
   解释: 因为无重复字符的最长子串是 "b"，所以其长度为 1。
   
   示例 3:
   输入: s = "pwwkew"
   输出: 3
   解释: 因为无重复字符的最长子串是 "wke"，所以其长度为 3。
   请注意，你的答案必须是 子串 的长度，"pwke" 是一个子序列，不是子串。
    
   提示：
   0 <= s.length <= 5 * 104
   s 由英文字母、数字、符号和空格组成
 */
/**
 * @param {string} s
 * @return {number}
 */
var lengthOfLongestSubstring = function (s) {
  // 使用 Map 存储字符及其最新出现的索引位置
  const map = new Map();
  let maxLen = 0; // 记录最长子串的长度
  let left = 0; // 滑动窗口的左边界

  for (let right = 0; right < s.length; right++) {
    const char = s[right];

    // 如果字符已存在且在当前窗口内，移动左边界
    if (map.has(char) && map.get(char) >= left) {
      left = map.get(char) + 1;
    }

    // 更新字符的最新位置
    map.set(char, right);

    // 更新最大长度
    maxLen = Math.max(maxLen, right - left + 1);
  }

  return maxLen;
};
/**
 * 复杂度分析
时间复杂度：O(n)
只需遍历字符串一次
Map 的查找和更新都是 O(1)


空间复杂度：O(min(m, n))
m 是字符集大小（如 ASCII 为 128）
n 是字符串长度
Map 最多存储 min(m, n) 个字符
 */
