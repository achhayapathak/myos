"use client"

import * as React from "react"
import {
  Search,
  X,
  ArrowUpDown,
  Filter,
  Check,
  Calendar,
  ArrowDown,
  ArrowUp,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type {
  TaskCounts,
  TaskDueDateFilter,
  TaskPriorityFilter,
  TaskSortField,
  TaskSortOrder,
  TaskStatusFilter,
} from "@/lib/tasks/utils"

interface TaskFiltersBarProps {
  statusFilter: TaskStatusFilter
  onStatusFilterChange: (status: TaskStatusFilter) => void
  priorityFilter: TaskPriorityFilter
  onPriorityFilterChange: (priority: TaskPriorityFilter) => void
  dueDateFilter: TaskDueDateFilter
  onDueDateFilterChange: (due: TaskDueDateFilter) => void
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  sortField: TaskSortField
  sortOrder: TaskSortOrder
  onSortChange: (field: TaskSortField, order: TaskSortOrder) => void
  counts: TaskCounts
  searchInputRef?: React.RefObject<HTMLInputElement | null>
}

const STATUS_TABS: { id: TaskStatusFilter; label: string; countKey: keyof TaskCounts }[] = [
  { id: "all", label: "All", countKey: "all" },
  { id: "active", label: "Active", countKey: "active" },
  { id: "todo", label: "To Do", countKey: "todo" },
  { id: "in_progress", label: "In Progress", countKey: "in_progress" },
  { id: "completed", label: "Completed", countKey: "completed" },
  { id: "cancelled", label: "Cancelled", countKey: "cancelled" },
]

const SORT_OPTIONS: { field: TaskSortField; label: string }[] = [
  { field: "due_at", label: "Due Date" },
  { field: "priority", label: "Priority" },
  { field: "created_at", label: "Date Created" },
  { field: "title", label: "Title" },
]

export function TaskFiltersBar({
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  dueDateFilter,
  onDueDateFilterChange,
  searchQuery,
  onSearchQueryChange,
  sortField,
  sortOrder,
  onSortChange,
  counts,
  searchInputRef,
}: TaskFiltersBarProps) {
  const hasActiveFilters =
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    dueDateFilter !== "all" ||
    searchQuery.trim().length > 0

  const handleResetFilters = () => {
    onStatusFilterChange("all")
    onPriorityFilterChange("all")
    onDueDateFilterChange("all")
    onSearchQueryChange("")
  }

  const currentSortLabel =
    SORT_OPTIONS.find((s) => s.field === sortField)?.label || "Date Created"

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Status Filter Tabs with counts */}
      <div className="flex items-center gap-1.5 border-b border-border/50 pb-2 overflow-x-auto no-scrollbar text-xs font-mono touch-pan-x -mx-1 px-1">
        {STATUS_TABS.map((tab) => {
          const isSelected = statusFilter === tab.id
          const count = counts[tab.countKey]

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onStatusFilterChange(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg font-medium transition-all shrink-0 cursor-pointer select-none touch-manipulation min-h-[36px] sm:min-h-0",
                isSelected
                  ? "bg-foreground text-background font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full",
                  isSelected
                    ? "bg-background/25 text-background"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* 2. Controls Row: Search Input & Dropdown Filters & Sorting */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Search Field */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search tasks... (Press / to focus)"
            className="pl-8 pr-14 text-base sm:text-xs h-9 sm:h-8 bg-card"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchQueryChange("")}
                className="size-4 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Clear search"
              >
                <X className="size-3" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted/60 rounded border border-border/60">
                /
              </kbd>
            )}
          </div>
        </div>

        {/* Filters & Sorting */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          {/* Priority Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant={priorityFilter !== "all" ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5 text-xs font-mono h-8 cursor-pointer"
                />
              }
            >
              <Filter className="size-3" />
              <span>
                {priorityFilter === "all"
                  ? "Priority"
                  : `Priority: ${priorityFilter.toUpperCase()}`}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 font-mono text-xs">
              <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onPriorityFilterChange("all")}>
                {priorityFilter === "all" && <Check className="size-3 mr-1 text-primary" />}
                <span>All Priorities</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPriorityFilterChange("high")}>
                {priorityFilter === "high" && <Check className="size-3 mr-1 text-red-500" />}
                <span className="text-red-500">High Priority</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPriorityFilterChange("medium")}>
                {priorityFilter === "medium" && <Check className="size-3 mr-1 text-amber-500" />}
                <span className="text-amber-500">Medium Priority</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPriorityFilterChange("low")}>
                {priorityFilter === "low" && <Check className="size-3 mr-1 text-blue-500" />}
                <span className="text-blue-500">Low Priority</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Due Date Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant={dueDateFilter !== "all" ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5 text-xs font-mono h-8 cursor-pointer"
                />
              }
            >
              <Calendar className="size-3" />
              <span>
                {dueDateFilter === "all"
                  ? "Due Date"
                  : dueDateFilter === "overdue"
                  ? "Overdue"
                  : dueDateFilter === "today"
                  ? "Today"
                  : dueDateFilter === "upcoming"
                  ? "Upcoming"
                  : "No Due Date"}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 font-mono text-xs">
              <DropdownMenuLabel>Filter by Due Date</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDueDateFilterChange("all")}>
                {dueDateFilter === "all" && <Check className="size-3 mr-1 text-primary" />}
                <span>All Due Dates</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDueDateFilterChange("today")}>
                {dueDateFilter === "today" && <Check className="size-3 mr-1 text-amber-500" />}
                <span>Due Today</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDueDateFilterChange("overdue")}>
                {dueDateFilter === "overdue" && <Check className="size-3 mr-1 text-destructive" />}
                <span className="text-destructive">Overdue</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDueDateFilterChange("upcoming")}>
                {dueDateFilter === "upcoming" && <Check className="size-3 mr-1 text-primary" />}
                <span>Upcoming</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDueDateFilterChange("no_due_date")}>
                {dueDateFilter === "no_due_date" && <Check className="size-3 mr-1 text-primary" />}
                <span>No Due Date</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs font-mono h-8 cursor-pointer"
                />
              }
            >
              <ArrowUpDown className="size-3" />
              <span>{currentSortLabel}</span>
              {sortOrder === "asc" ? (
                <ArrowUp className="size-2.5 text-muted-foreground ml-0.5" />
              ) : (
                <ArrowDown className="size-2.5 text-muted-foreground ml-0.5" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 font-mono text-xs">
              <DropdownMenuLabel>Sort By</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {SORT_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.field}
                  onClick={() =>
                    onSortChange(
                      opt.field,
                      sortField === opt.field
                        ? sortOrder === "asc"
                          ? "desc"
                          : "asc"
                        : "desc"
                    )
                  }
                >
                  {sortField === opt.field && <Check className="size-3 mr-1 text-primary" />}
                  <span>{opt.label}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  onSortChange(sortField, sortOrder === "asc" ? "desc" : "asc")
                }
              >
                <span>
                  Order: {sortOrder === "asc" ? "Ascending ↑" : "Descending ↓"}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs font-mono h-8 text-muted-foreground hover:text-foreground cursor-pointer px-2"
              title="Reset all filters"
            >
              <X className="size-3 mr-1" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
