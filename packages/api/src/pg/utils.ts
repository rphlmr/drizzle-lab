export const vectorOps = [
  "vector_l2_ops",
  "vector_ip_ops",
  "vector_cosine_ops",
  "vector_l1_ops",
  "bit_hamming_ops",
  "bit_jaccard_ops",
  "halfvec_l2_ops",
  "sparsevec_l2_ops",
];

export function isPgArrayType(sqlType: string) {
  return sqlType.match(/.*\[\d*\].*|.*\[\].*/g) !== null;
}
