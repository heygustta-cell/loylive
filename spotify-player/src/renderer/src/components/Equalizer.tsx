export function Equalizer({ paused }: { paused: boolean }) {
  return (
    <span className="eq" data-paused={paused ? 'true' : 'false'} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  )
}
