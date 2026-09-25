export default function ResultBadge({ passed }: { passed: boolean }) {
  return (
    <span className={`result-badge ${passed ? "result-pass" : "result-fail"}`}>{passed ? "PASS" : "FAIL"}</span>
  );
}
