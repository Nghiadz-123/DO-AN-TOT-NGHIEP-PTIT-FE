import { useContext } from 'react'
import { InboxContext } from '@/context/InboxContext'

// { enabled, summary: { newInvitations }, refresh() } — số thư mời ứng tuyển ứng viên chưa xem
export default function useInbox() {
  return useContext(InboxContext)
}
