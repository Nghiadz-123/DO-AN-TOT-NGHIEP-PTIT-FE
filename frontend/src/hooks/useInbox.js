import { useContext } from 'react'
import { InboxContext } from '@/context/InboxContext'

// { enabled, summary: { unreadMessages, unreadConversations, pendingRequests }, refresh() }
export default function useInbox() {
  return useContext(InboxContext)
}
