"use client"

import type React from "react"

import { useState } from "react"
import { useCompany } from "@/contexts/company-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

interface CreateCompanyFormProps {
  onSuccess: () => void
  onCancel: () => void
}

const industries = [
  "Technology",
  "Healthcare",
  "Finance",
  "Retail",
  "Manufacturing",
  "Construction",
  "Education",
  "Real Estate",
  "Food & Beverage",
  "Transportation",
  "Professional Services",
  "Other",
]

export function CreateCompanyForm({ onSuccess, onCancel }: CreateCompanyFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    industry: "",
    address: "",
    phone: "",
    email: "",
    taxId: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { createCompany } = useCompany()

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!formData.name.trim()) {
      setError("Company name is required")
      return
    }

    setLoading(true)

    try {
      await createCompany(formData)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create company")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Company Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Enter company name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Select value={formData.industry} onValueChange={(value) => handleChange("industry", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {industries.map((industry) => (
                <SelectItem key={industry} value={industry}>
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Brief description of your company"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="company@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => handleChange("address", e.target.value)}
          placeholder="Company address"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="taxId">Tax ID / EIN</Label>
        <Input
          id="taxId"
          value={formData.taxId}
          onChange={(e) => handleChange("taxId", e.target.value)}
          placeholder="12-3456789"
        />
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Company
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
