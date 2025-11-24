/*
 * @Author: FrankFungcode combeebe@gmail.com
 * @Date: 2025-11-24 22:58:25
 * @LastEditors: FrankFungcode combeebe@gmail.com
 * @LastEditTime: 2025-11-25 00:35:02
 * @FilePath: \everyday-algorithm\6.1111-leetcode.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

/**
 * leetcode 76. 最小覆盖子串
 * https://leetcode.cn/problems/minimum-window-substring/
 * 给你一个字符串 s 、一个字符串 t 。返回 s 中涵盖 t 所有字符的最小子串。如果 s 中不存在涵盖 t 所有字符的子串，则返回空字符串 "" 。

   注意：
   对于 t 中重复字符，我们寻找的子字符串中该字符数量必须不少于 t 中该字符数量。
   如果 s 中存在这样的子串，我们保证它是唯一的答案。
    
   
   示例 1：
   输入：s = "ADOBECODEBANC", t = "ABC"
   输出："BANC"
   解释：最小覆盖子串 "BANC" 包含来自字符串 t 的 'A'、'B' 和 'C'。
   
   示例 2：
   输入：s = "a", t = "a"
   输出："a"
   解释：整个字符串 s 是最小覆盖子串。
   
   示例 3:
   输入: s = "a", t = "aa"
   输出: ""
   解释: t 中两个字符 'a' 均应包含在 s 的子串中，
   因此没有符合条件的子字符串，返回空字符串。
    
   
   提示：
   m == s.length
   n == t.length
   1 <= m, n <= 105
   s 和 t 由英文字母组成
   
   进阶：你能设计一个在 o(m+n) 时间内解决此问题的算法吗？
 */
/**
 * @param {string} s
 * @param {string} t
 * @return {string}
 */
var minWindow = function (s, t) {
  // 边界处理
  if (s.length < t.length) return "";

  // 统计 t 中每个字符的需要数量
  const need = new Map();
  for (let char of t) {
    need.set(char, (need.get(char) || 0) + 1);
  }

  // 窗口中每个字符的实际数量
  const window = new Map();

  let left = 0,
    right = 0;
  let valid = 0; // 窗口中已满足条件的字符种类数
  let start = 0,
    minLen = Infinity; // 记录最小覆盖子串的起始位置和长度

  while (right < s.length) {
    // 扩大窗口
    const c = s[right];
    right++;

    // 更新窗口数据
    if (need.has(c)) {
      window.set(c, (window.get(c) || 0) + 1);
      // 当窗口中某字符数量达到需要的数量时，valid++
      if (window.get(c) === need.get(c)) {
        valid++;
      }
    }

    // 判断是否需要收缩窗口
    while (valid === need.size) {
      // 更新最小覆盖子串
      if (right - left < minLen) {
        start = left;
        minLen = right - left;
      }

      // 缩小窗口
      const d = s[left];
      left++;

      // 更新窗口数据
      if (need.has(d)) {
        // 当窗口中某字符数量等于需要的数量时，移除后 valid--
        if (window.get(d) === need.get(d)) {
          valid--;
        }
        window.set(d, window.get(d) - 1);
      }
    }
  }

  return minLen === Infinity ? "" : s.substring(start, start + minLen);
};
/**
 * 复杂度分析
时间复杂度：O(m + n)，m 是 s 长度，n 是 t 长度，每个字符最多被访问 2 次
空间复杂度：O(k)，k 是字符集大小（最多 52 个字母）
 */
