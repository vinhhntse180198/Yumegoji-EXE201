/** Vỏ split full màn — chỉ fade nhẹ (không “hộp” trượt cả khung). */
export const loginShellVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

export const loginStaggerParent = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.14 },
  },
};

/** Form bên phải: trượt lên lần lượt (staggered entrance). */
export const loginStaggerItem = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Hero trái: xuất hiện mượt, không khung glass. */
export const loginHeroGlass = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.06 },
  },
};
