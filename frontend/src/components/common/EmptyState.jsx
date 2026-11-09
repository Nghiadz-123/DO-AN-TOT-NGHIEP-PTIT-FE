import { Inbox } from 'lucide-react'

export default function EmptyState({ title, description, action, icon: Icon = Inbox }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">
        <Icon />
      </span>
      <h2 className="empty-state-title">{title}</h2>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}
