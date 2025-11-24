/*
 * @Author: FrankFungcode combeebe@gmail.com
 * @Date: 2025-11-06 15:52:50
 * @LastEditors: FrankFungcode combeebe@gmail.com
 * @LastEditTime: 2025-11-07 15:21:18
 * @FilePath: \每日作业\2.1105.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

/**
 * leetcode题号20 链接地址 https://leetcode.cn/problems/valid-parentheses/
 * @param {*} s 
 * @returns 
 * 给定一个只包括 '('，')'，'{'，'}'，'['，']' 的字符串 s ，判断字符串是否有效。

有效字符串需满足：

左括号必须用相同类型的右括号闭合。
左括号必须以正确的顺序闭合。
每个右括号都有一个对应的相同类型的左括号。
 

示例 1：

输入：s = "()"

输出：true

示例 2：

输入：s = "()[]{}"

输出：true

示例 3：

输入：s = "(]"

输出：false

示例 4：

输入：s = "([])"

输出：true

示例 5：

输入：s = "([)]"

输出：false

 

提示：

1 <= s.length <= 104
s 仅由括号 '()[]{}' 组成
 */

var isValid = function(s) {
    // 括号映射表：右括号对应左括号
    const mapping = { ')': '(', '}': '{', ']': '[' };
    const stk = []; // 数组模拟栈
    
    for (const char of s) {
        // 若为右括号，检查栈顶是否匹配
        if (char in mapping) {
            // 栈空或栈顶不匹配，直接返回false
            if (!stk.length || stk.pop() !== mapping[char]) {
                return false;
            }
        } else {
            // 左括号直接入栈
            stk.push(char);
        }
    }
    
    // 遍历结束后栈为空，说明所有括号都匹配
    return stk.length === 0;
};