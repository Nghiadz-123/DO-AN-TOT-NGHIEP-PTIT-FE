import { Route, Routes } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import RecruiterLayout from '@/layouts/RecruiterLayout'
import LoginPage from '@/pages/Auth/LoginPage'
import RegisterPage from '@/pages/Auth/RegisterPage'
import CVAnalysisPage from '@/pages/Candidate/CVAnalysisPage'
import CVFormPage from '@/pages/Candidate/CVFormPage'
import ManageCVsPage from '@/pages/Candidate/ManageCVsPage'
import MyApplicationsPage from '@/pages/Candidate/MyApplicationsPage'
import ProfilePage from '@/pages/Candidate/ProfilePage'
import RecommendedJobsPage from '@/pages/Candidate/RecommendedJobsPage'
import HomePage from '@/pages/Home/HomePage'
import JobDetailPage from '@/pages/Jobs/JobDetailPage'
import JobListPage from '@/pages/Jobs/JobListPage'
import NotFoundPage from '@/pages/NotFound/NotFoundPage'
import AccountPage from '@/pages/Recruiter/AccountPage'
import ApplicantDetailPage from '@/pages/Recruiter/ApplicantDetailPage'
import ApplicantsPage from '@/pages/Recruiter/ApplicantsPage'
import CompanyProfilePage from '@/pages/Recruiter/CompanyProfilePage'
import DashboardPage from '@/pages/Recruiter/DashboardPage'
import JobFormPage from '@/pages/Recruiter/JobFormPage'
import ManageJobsPage from '@/pages/Recruiter/ManageJobsPage'
import AdminPage from '@/pages/Admin/AdminPage'
import { ROLES } from '@/utils/constants'
import ProtectedRoute from './ProtectedRoute'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/jobs" element={<JobListPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />

        <Route element={<ProtectedRoute role={ROLES.CANDIDATE} />}>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/cv" element={<ManageCVsPage />} />
          <Route path="/cv/new" element={<CVFormPage />} />
          <Route path="/cv/:id/edit" element={<CVFormPage />} />
          <Route path="/cv-analysis" element={<CVAnalysisPage />} />
          <Route path="/recommended-jobs" element={<RecommendedJobsPage />} />
          <Route path="/my-applications" element={<MyApplicationsPage />} />
        </Route>

        <Route element={<ProtectedRoute role={ROLES.ADMIN} />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route element={<ProtectedRoute role={ROLES.RECRUITER} />}>
        <Route path="/recruiter" element={<RecruiterLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="jobs" element={<ManageJobsPage />} />
          <Route path="jobs/new" element={<JobFormPage />} />
          <Route path="jobs/:id/edit" element={<JobFormPage />} />
          <Route path="applicants" element={<ApplicantsPage />} />
          <Route path="applicants/:id" element={<ApplicantDetailPage />} />
          <Route path="company" element={<CompanyProfilePage />} />
          <Route path="account" element={<AccountPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

