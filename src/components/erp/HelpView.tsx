"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Search,
  BookOpen,
  Receipt,
  BarChart3,
  ShieldCheck,
  Settings,
  ArrowLeft,
  ChevronRight,
  FileQuestion,
  HelpCircle,
} from "lucide-react"
import {
  helpCategories,
  searchArticles,
  type HelpArticle,
  type HelpCategory,
} from "@/lib/help-articles"

const iconMap: Record<string, React.ElementType> = {
  BookOpen,
  Receipt,
  BarChart3,
  ShieldCheck,
  Settings,
}

export default function HelpView() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(
    null
  )

  const filteredArticles = useMemo(() => {
    let articles = searchArticles(searchQuery)

    if (selectedCategory) {
      articles = articles.filter((a) => a.category === selectedCategory)
    }

    return articles
  }, [searchQuery, selectedCategory])

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory((prev) => (prev === categoryId ? null : categoryId))
    setSelectedArticle(null)
  }

  const handleArticleClick = (article: HelpArticle) => {
    setSelectedArticle(article)
  }

  const handleBack = () => {
    setSelectedArticle(null)
  }

  // Article detail view
  if (selectedArticle) {
    const category = helpCategories.find(
      (c) => c.id === selectedArticle.category
    )
    const CategoryIcon = category ? iconMap[category.icon] : HelpCircle

    return (
      <div className="flex h-full flex-col">
        {/* Top bar */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-1.5 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Volver</span>
          </Button>

          <div className="flex items-center gap-2">
            <CategoryIcon className="h-4 w-4 text-emerald-600" />
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
              {category?.name}
            </Badge>
          </div>
        </div>

        {/* Article content */}
        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              {selectedArticle.title}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {category?.name} ·{" "}
              {selectedArticle.content
                .split(/\s+/)
                .slice(0, 3)
                .join(" ")
                .replace(/[.,;:]$/, "")}
              ...
            </p>
            <hr className="my-6 border-slate-200" />
            <div className="prose-custom">
              {selectedArticle.content.split("\n\n").map((paragraph, i) => (
                <p
                  key={i}
                  className="mb-4 text-[15px] leading-relaxed text-slate-700 first:mt-0"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    )
  }

  // Main list view
  return (
    <div className="flex h-full flex-col">
      {/* Header with search */}
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Centro de Ayuda
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Encontrá respuestas a tus preguntas sobre ContaFlow
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar artículos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-slate-200 bg-slate-50 pl-9 focus-visible:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-slate-50/50 md:block">
          <ScrollArea className="h-full">
            <div className="p-3">
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Categorías
              </p>
              <nav className="space-y-0.5">
                <button
                  onClick={() => handleCategoryClick("all" as unknown as string)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    selectedCategory === null
                      ? "bg-emerald-100 text-emerald-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <HelpCircle className="h-4 w-4" />
                  Todas las categorías
                </button>

                {helpCategories.map((cat) => {
                  const Icon = iconMap[cat.icon] || HelpCircle
                  const isActive = selectedCategory === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.id)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{cat.name}</span>
                      <Badge
                        variant="secondary"
                        className={`ml-auto shrink-0 text-xs ${
                          isActive
                            ? "bg-emerald-200 text-emerald-800"
                            : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {cat.articles.length}
                      </Badge>
                    </button>
                  )
                })}
              </nav>
            </div>
          </ScrollArea>
        </aside>

        {/* Mobile category chips */}
        <div className="block border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
                onClick={() => setSelectedCategory(null)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedCategory === null
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Todas
              </button>
              {helpCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedCategory === cat.id
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto">
          <ScrollArea className="h-full">
            <div className="p-4 sm:p-6">
              {/* Search results info */}
              {searchQuery && (
                <p className="mb-4 text-sm text-slate-500">
                  {filteredArticles.length} resultado
                  {filteredArticles.length !== 1 && "s"} para{" "}
                  <span className="font-medium text-slate-700">
                    &quot;{searchQuery}&quot;
                  </span>
                </p>
              )}

              {filteredArticles.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                    <FileQuestion className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700">
                    No se encontraron artículos
                  </h3>
                  <p className="mt-2 max-w-sm text-sm text-slate-500">
                    {searchQuery
                      ? `No hay resultados para "${searchQuery}". Probá con otros términos de búsqueda o seleccioná una categoría diferente.`
                      : "No hay artículos en esta categoría. Probá seleccionando otra categoría o usando el buscador."}
                  </p>
                  {(searchQuery || selectedCategory) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("")
                        setSelectedCategory(null)
                      }}
                      className="mt-4 border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              ) : (
                /* Articles grouped by category */
                <div className="space-y-6">
                  {(() => {
                    const grouped: Record<string, { cat: HelpCategory; articles: HelpArticle[] }> = {}
                    filteredArticles.forEach((article) => {
                      if (!grouped[article.category]) {
                        const cat = helpCategories.find(
                          (c) => c.id === article.category
                        )
                        if (cat) {
                          grouped[article.category] = { cat, articles: [] }
                        }
                      }
                      if (grouped[article.category]) {
                        grouped[article.category].articles.push(article)
                      }
                    })

                    return Object.values(grouped).map(({ cat, articles }) => {
                      const Icon = iconMap[cat.icon] || HelpCircle
                      return (
                        <div key={cat.id}>
                          {/* Category heading */}
                          <div className="mb-3 flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                              <Icon className="h-4 w-4" />
                            </div>
                            <h2 className="text-base font-semibold text-slate-800">
                              {cat.name}
                            </h2>
                            <Badge
                              variant="secondary"
                              className="bg-slate-100 text-xs text-slate-500"
                            >
                              {articles.length}
                            </Badge>
                          </div>

                          {/* Article cards */}
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {articles.map((article) => (
                              <Card
                                key={article.id}
                                className="group cursor-pointer border-slate-200 bg-white transition-all hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-50"
                                onClick={() => handleArticleClick(article)}
                              >
                                <CardHeader className="p-4 pb-2">
                                  <CardTitle className="text-sm font-semibold text-slate-800 transition-colors group-hover:text-emerald-700">
                                    {article.title}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="px-4 pb-4">
                                  <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">
                                    {article.content.split("\n\n")[0]}
                                  </p>
                                  <div className="mt-3 flex items-center gap-1 text-xs font-medium text-emerald-600 opacity-0 transition-opacity group-hover:opacity-100">
                                    Leer artículo
                                    <ChevronRight className="h-3 w-3" />
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              )}
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  )
}
