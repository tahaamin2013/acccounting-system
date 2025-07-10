"use client"

import { useState } from "react"
import { useCompany } from "@/contexts/company-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Building2, Plus } from "lucide-react"
import { CreateCompanyForm } from "./create-company-form"

export function CompanySelector() {
  const { companies, currentCompany, setCurrentCompany, loading } = useCompany()
  const [showCreateForm, setShowCreateForm] = useState(false)

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (companies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Welcome to AccounTech
          </CardTitle>
          <CardDescription>
            To get started, youll need to create your first company. This will be your main accounting entity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showCreateForm ? (
            <CreateCompanyForm onSuccess={() => setShowCreateForm(false)} onCancel={() => setShowCreateForm(false)} />
          ) : (
            <Button onClick={() => setShowCreateForm(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Company
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </div>
        </CardTitle>
        <CardDescription>Select the company you want to work with</CardDescription>
      </CardHeader>
      <CardContent>
        {showCreateForm ? (
          <CreateCompanyForm onSuccess={() => setShowCreateForm(false)} onCancel={() => setShowCreateForm(false)} />
        ) : (
          <div className="space-y-4">
            <Select
              value={currentCompany?.id || ""}
              onValueChange={(value) => {
                const company = companies.find((c) => c.id === value)
                setCurrentCompany(company || null)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{company.name}</span>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {company.role}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {currentCompany && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{currentCompany.name}</h3>
                    {currentCompany.description && (
                      <p className="text-sm text-muted-foreground mt-1">{currentCompany.description}</p>
                    )}
                    {currentCompany.industry && (
                      <Badge variant="outline" className="mt-2">
                        {currentCompany.industry}
                      </Badge>
                    )}
                  </div>
                  <Badge variant="secondary">{currentCompany.role}</Badge>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
