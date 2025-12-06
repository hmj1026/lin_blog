/**
 * 合併 Class Name 的工具函式
 * 結合了 clsx 和 tailwind-merge 的功能
 * 
 * @param classes - Class Name 列表
 * @returns 合併後的 Class Name 字串
 */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
