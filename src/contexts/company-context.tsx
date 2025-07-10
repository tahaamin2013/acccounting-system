"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useAuth } from "./auth-context"

interface Company {
  id: string
  name: string
  description?: string
  industry?: string
  address?: string
  phone?: string
  email?: string
  tax_id?: string
  role: string
  created_at: string
}

interface CompanyContextType {
  companies: Company[]
  currentCompany: Company | null
  setCurrentCompany: (company: Company | null) => void
  createCompany: (companyData: CreateCompanyData) => Promise<void>
  updateCompany: (companyId: string, companyData: Partial<Company>) => Promise<void>
  loading: boolean
  refreshCompanies: () => Promise<void>
}

interface CreateCompanyData {
  name: string
  description?: string
  industry?: string
  address?: string
  phone?: string
  email?: string
  taxId?: string
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token")
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }
  }

  const fetchCompanies = async () => {
    if (!user) return

    try {
      const response = await fetch("/api/companies", {
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        setCompanies(data.companies)

        // Set current company from localStorage or first company
        const savedCompanyId = localStorage.getItem("currentCompanyId")
        if (savedCompanyId) {
          const savedCompany = data.companies.find((c: Company) => c.id === savedCompanyId)
          if (savedCompany) {
            setCurrentCompany(savedCompany)
          } else if (data.companies.length > 0) {
            setCurrentCompany(data.companies[0])
            localStorage.setItem("currentCompanyId", data.companies[0].id)
          }
        } else if (data.companies.length > 0) {
          setCurrentCompany(data.companies[0])
          localStorage.setItem("currentCompanyId", data.companies[0].id)
        }
      }
    } catch (error) {
      console.error("Error fetching companies:", error)
    } finally {
      setLoading(false)
    }
  }

  const createCompany = async (companyData: CreateCompanyData) => {
    const response = await fetch("/api/companies", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(companyData),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Failed to create company")
    }

    await fetchCompanies()
  }

  const updateCompany = async (companyId: string, companyData: Partial<Company>) => {
    const response = await fetch(`/api/companies/${companyId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(companyData),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Failed to update company")
    }

    await fetchCompanies()
  }

  const refreshCompanies = async () => {
    setLoading(true)
    await fetchCompanies()
  }

  const handleSetCurrentCompany = (company: Company | null) => {
    setCurrentCompany(company)
    if (company) {
      localStorage.setItem("currentCompanyId", company.id)
    } else {
      localStorage.removeItem("currentCompanyId")
    }
  }

  useEffect(() => {
    if (user) {
      fetchCompanies()
    } else {
      setCompanies([])
      setCurrentCompany(null)
      setLoading(false)
    }
  }, [user])

  return (
    <CompanyContext.Provider
      value={{
        companies,
        currentCompany,
        setCurrentCompany: handleSetCurrentCompany,
        createCompany,
        updateCompany,
        loading,
        refreshCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const context = useContext(CompanyContext)
  if (context === undefined) {
    throw new Error("useCompany must be used within a CompanyProvider")
  }
  return context
}
