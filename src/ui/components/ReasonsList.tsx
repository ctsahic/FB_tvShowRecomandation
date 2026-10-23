import type { Reason } from '../../types'

function classNameFor(reason: Reason): string {
  if (reason.kind === 'favorite' || reason.kind === 'favoriteTeam') {
    return 'reason reason--favorite'
  }
  if (reason.weight < 0) return 'reason reason--negative'
  return 'reason'
}

export function ReasonsList({ reasons }: { reasons: readonly Reason[] }) {
  if (reasons.length === 0) return null
  return (
    <ul className="reasons">
      {reasons.map((reason, index) => (
        <li key={`${reason.kind}-${index}`} className={classNameFor(reason)}>
          {reason.text}
        </li>
      ))}
    </ul>
  )
}
