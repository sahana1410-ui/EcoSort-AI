
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './legacy.css'

type Category = {
  color: string
  items: string[]
  bin: string
  method: string
  avoid: string
}

type RecentRecord = {
  id: number
  category: string
  item_name: string
  quantity: number
  unit: string
  created_at: string
}

type Stats = {
  total_records: number
  total_quantity: number
  quiz_attempts: number
  recent: RecentRecord[]
}

const categoryMeta: Record<string, [string, string]> = {
  Organic: ['🍃', 'Compostable'],
  Plastic: ['🧴', 'Dry waste'],
  Paper: ['📄', 'Dry waste'],
  Glass: ['🍶', 'Special collection'],
  Metal: ['🥫', 'Dry waste'],
  'E-waste': ['🔌', 'Special collection'],
  Hazardous: ['⚠️', 'Special collection']
}

const questions = [
  {
    q: 'Where should clean, dry newspapers usually go?',
    a: ['Organic waste', 'Paper recycling', 'E-waste', 'Hazardous waste'],
    correct: 1,
    explain: 'Clean, dry newspapers can usually be sent for paper recycling.'
  },
  {
    q: 'What is a good way to handle fruit and vegetable peels?',
    a: ['Put them with glass', 'Burn them', 'Compost them', 'Put them with batteries'],
    correct: 2,
    explain: 'Fruit and vegetable peels are organic waste and can be composted.'
  },
  {
    q: 'Where should an old mobile phone be taken?',
    a: ['Regular food-waste bin', 'Authorised e-waste collection', 'Paper bin', 'Compost pit'],
    correct: 1,
    explain: 'Phones need specialist e-waste handling.'
  },
  {
    q: 'Why should recyclable containers be empty and clean?',
    a: ['To reduce contamination', 'To make them heavier', 'To change their colour', 'It does not matter'],
    correct: 0,
    explain: 'Food residue can contaminate other recyclable materials.'
  },
  {
    q: 'What should you do with unknown household chemicals?',
    a: ['Pour them into a drain', 'Mix them together', 'Put them in compost', 'Follow local hazardous-waste guidance'],
    correct: 3,
    explain: 'Unknown chemicals should never be mixed or poured into drains.'
  },
    {
    q: 'Which waste is suitable for composting?',
    a: ['Plastic wrappers', 'Vegetable peels', 'Glass bottles', 'Metal cans'],
    correct: 1,
    explain: 'Vegetable peels are biodegradable organic waste.'
  },
  {
    q: 'What should you do with an empty glass bottle?',
    a: ['Burn it', 'Bury it', 'Send it for glass recycling', 'Mix it with food waste'],
    correct: 2,
    explain: 'Glass bottles can often be recycled through suitable collection systems.'
  },
  {
    q: 'Which of these is an example of e-waste?',
    a: ['Old keyboard', 'Banana peel', 'Newspaper', 'Cardboard box'],
    correct: 0,
    explain: 'Old electronic devices and accessories are e-waste.'
  },
  {
    q: 'What does the first R in the 3Rs stand for?',
    a: ['Recycle', 'Reduce', 'Repair', 'Replace'],
    correct: 1,
    explain: 'Reduce means avoiding unnecessary waste.'
  },
  {
    q: 'Why should batteries be collected separately?',
    a: ['They are compostable', 'They are harmless', 'They may contain hazardous materials', 'They are paper products'],
    correct: 2,
    explain: 'Batteries need appropriate collection and handling.'
  },
  {
    q: 'Which action helps reduce plastic waste?',
    a: ['Using reusable bags', 'Buying more plastic bags', 'Burning plastic', 'Throwing plastic into drains'],
    correct: 0,
    explain: 'Reusable bags reduce the need for single-use plastic bags.'
  },
  {
    q: 'What is biodegradable waste?',
    a: ['Waste that can naturally decompose', 'Metal waste', 'Electronic waste', 'Glass waste'],
    correct: 0,
    explain: 'Biodegradable materials can break down naturally.'
  },
  {
    q: 'Which item is commonly recyclable as paper?',
    a: ['Used tissue', 'Clean cardboard', 'Food-soiled paper', 'Wax-coated paper'],
    correct: 1,
    explain: 'Clean cardboard is commonly accepted in paper recycling.'
  },
  {
    q: 'What is the purpose of waste segregation?',
    a: ['To increase pollution', 'To mix all waste', 'To make recycling and disposal easier', 'To create more waste'],
    correct: 2,
    explain: 'Segregation separates waste into suitable categories for handling.'
  },
  {
    q: 'Which habit helps conserve water?',
    a: ['Leaving taps running', 'Fixing leaking taps', 'Washing roads daily', 'Keeping taps open'],
    correct: 1,
    explain: 'Fixing leaks prevents unnecessary water loss.'
  }
]

const API_BASE_URL = 'https://ecosort-ai-backend-3xhw.onrender.com'

async function api(url: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong.')
  }

  return data
}

function shuffleQuestions() {
  const shuffled = [...questions]

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled.slice(0, 5)
}

function App() {
  const [categories, setCategories] = useState<Record<string, Category>>({})
  const [selectedCategory, setSelectedCategory] = useState('')
  const [stats, setStats] = useState<Stats>({
    total_records: 0,
    total_quantity: 0,
    quiz_attempts: 0,
    recent: []
  })

  const [loading, setLoading] = useState(true)
  const [connectionError, setConnectionError] = useState('')

  const [centers, setCenters] = useState<
    Array<{
      id: number
      name: string
      address: string
      city: string
      state: string
      postal_code: string
      accepted_categories: string
      phone: string
      website: string
      latitude: number | null
      longitude: number | null
    }>
  >([])

  const [centerLoading, setCenterLoading] = useState(false)
  const [centerError, setCenterError] = useState('')
  const [centerSearch, setCenterSearch] = useState('')
  const [centerCategory, setCenterCategory] = useState('All')
  const [completedChallenges, setCompletedChallenges] = useState<string[]>(() => {
  try {
    const saved = localStorage.getItem('ecosort-daily-challenges')
    if (!saved) return []

    const data = JSON.parse(saved)

    return data.date === new Date().toDateString()
      ? data.completed
      : []
  } catch {
    return []
  }
})

  const ecoChallenges = [
    'Carry a reusable water bottle.',
    'Avoid single-use plastic today.',
    'Separate wet and dry waste.',
    'Switch off unused electrical appliances.',
    'Reuse paper whenever possible.',
    'Dispose of batteries responsibly.'
  ]
  useEffect(() => {
  localStorage.setItem(
    'ecosort-daily-challenges',
    JSON.stringify({
      date: new Date().toDateString(),
      completed: completedChallenges
    })
  )
}, [completedChallenges])


  const [form, setForm] = useState({
    category: '',
    item_name: '',
    quantity: '',
    unit: 'kg',
    notes: ''
  })

  const [formMessage, setFormMessage] = useState('')
  const [formError, setFormError] = useState(false)
  const [saving, setSaving] = useState(false)

  const [questionIndex, setQuestionIndex] = useState(0)
  const [quizQuestions, setQuizQuestions] = useState(() => shuffleQuestions())
  const [score, setScore] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [quizName, setQuizName] = useState('')
  const [quizMessage, setQuizMessage] = useState('')
  const [quizSaving, setQuizSaving] = useState(false)

  async function loadCategories() {
    const data = await api('/api/categories')
    setCategories(data)
  }

  async function loadDashboard() {
    const data = await api('/api/stats')
    setStats(data)
  }

  async function loadCenters() {
    setCenterLoading(true)
    setCenterError('')

    try {
      const data = await api('/api/centers')
      setCenters(data)
    } catch (error) {
      setCenterError(
        error instanceof Error
          ? error.message
          : 'Could not load recycling centres.'
      )
    } finally {
      setCenterLoading(false)
    }
  }


  useEffect(() => {
    async function initialize() {
      try {
        await Promise.all([
          loadCategories(),
          loadDashboard(),
          loadCenters()
        ])
      } catch (error) {
        setConnectionError(
          error instanceof Error ? error.message : 'Could not connect to Flask.'
        )
      } finally {
        setLoading(false)
      }
    }

    initialize()
  }, [])

  function showGuide(name: string) {
    setSelectedCategory(name)
    setForm(previous => ({ ...previous, category: name }))
  }

  async function handleWasteSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setSaving(true)
    setFormMessage('Saving...')
    setFormError(false)

    try {
      const result = await api('/api/records', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          quantity: form.quantity
        })
      })

      setFormMessage(result.message)

      setForm({
        category: '',
        item_name: '',
        quantity: '',
        unit: 'kg',
        notes: ''
      })

      await loadDashboard()
    } catch (error) {
      setFormError(true)
      setFormMessage(
        error instanceof Error ? error.message : 'Could not save record.'
      )
    } finally {
      setSaving(false)
    }
  }

  function selectAnswer(index: number) {
    if (answered) return

    setSelectedAnswer(index)
    setAnswered(true)

    if (index === quizQuestions[questionIndex].correct) {
      setScore(previous => previous + 1)
    }
  }

  function nextQuestion() {
    if (questionIndex < quizQuestions.length - 1) {
      setQuestionIndex(previous => previous + 1)
      setSelectedAnswer(null)
      setAnswered(false)
    } else {
      setCompleted(true)
    }
  }

  async function saveQuiz() {
    setQuizSaving(true)
    setQuizMessage('Saving...')

    try {
      const result = await api('/api/quiz', {
        method: 'POST',
        body: JSON.stringify({
          name: quizName.trim() || 'Guest',
          score,
          total: quizQuestions.length
        })
      })

      setQuizMessage(result.message)
      await loadDashboard()
    } catch (error) {
      setQuizMessage(
        error instanceof Error ? error.message : 'Could not save quiz.'
      )
    } finally {
      setQuizSaving(false)
    }
  }

  function retryQuiz() {
  setQuizQuestions(shuffleQuestions())
  setQuestionIndex(0)
  setScore(0)
  setSelectedAnswer(null)
  setAnswered(false)
  setCompleted(false)
  setQuizName('')
  setQuizMessage('')
}

  const currentQuestion = quizQuestions[questionIndex]
  const filteredCenters = centers.filter(center => {
  const search = centerSearch.toLowerCase()

  const matchesSearch =
    center.name.toLowerCase().includes(search) ||
    center.address.toLowerCase().includes(search) ||
    center.city.toLowerCase().includes(search) ||
    center.accepted_categories.toLowerCase().includes(search)

  const matchesCategory =
    centerCategory === 'All' ||
    center.accepted_categories
      .toLowerCase()
      .includes(centerCategory.toLowerCase())

  return matchesSearch && matchesCategory
})

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brand-mark">♻</span>
          <span>
            EcoSort
            <small>WASTE AWARENESS</small>
          </span>
        </a>

        <nav>
          <a href="#dashboard">Dashboard</a>
          <a href="#guide">Segregation Guide</a>
          <a href="#log">Log Waste</a>
          <a href="#centers">Recycling Centres</a>
          <a href="#quiz">Take Quiz</a>
          <a href="#learn">Learning Zone</a>
        </nav>

        <a className="top-cta" href="#log">
          Get started <span>↗</span>
        </a>
      </header>

      <main>
        {/* HERO SECTION */}
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span></span> SMALL ACTIONS. BIG IMPACT.
            </div>

            <h1>
              Sort it right.
              <br />
              <em>Save our planet.</em>
            </h1>

            <p>
              Make waste segregation simple. Learn where every item belongs,
              track your recycling habits and take a step towards a cleaner
              tomorrow.
            </p>

            <div className="hero-actions">
              <a className="btn primary" href="#guide">
                Explore the guide <span>→</span>
              </a>

              <a className="text-link" href="#dashboard">
                View dashboard ↓
              </a>
            </div>

            <div className="hero-note">
              <span className="avatars">● ● ●</span>
              <span>
                Every correctly sorted item makes a difference.
              </span>
            </div>
          </div>

          <div className="hero-art">
            <div className="sun"></div>
            <div className="leaf leaf-one">✦</div>
            <div className="leaf leaf-two">✦</div>

            <div className="art-circle">
              <div className="recycle">♻</div>
              <div className="plant">🌱</div>
            </div>

            <div className="floating-card card-left">
              <span className="mini-icon green">✓</span>
              <div>
                <b>Sort smart</b>
                <small>Know your waste</small>
              </div>
            </div>

            <div className="floating-card card-right">
              <span className="mini-icon blue">↗</span>
              <div>
                <b>Track impact</b>
                <small>Build better habits</small>
              </div>
            </div>

            <div className="ground"></div>
          </div>
        
          <div className="panel" style={{ marginTop: 30, padding: 28 }}>
            <div className="eyebrow">YOUR DAILY GREEN ACTION</div>
            <h2>Daily Eco Challenges 🌱</h2>
            <p className="muted">
              Complete small actions to build environmentally friendly habits.
            </p>

            <h3>
              Progress: {completedChallenges.length} / {ecoChallenges.length}
            </h3>

            <div className="progress">
              <span
                style={{
                  display: 'block',
                  width: `${(completedChallenges.length / ecoChallenges.length) * 100}%`,
                  height: '100%',
                  background: '#398653'
                }}
              />
            </div>

            {ecoChallenges.map(challenge => (
              <label
                key={challenge}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid #e2e9e2'
                }}
              >
                <input
                  type="checkbox"
                  checked={completedChallenges.includes(challenge)}
                  onChange={e => {
                    setCompletedChallenges(previous =>
                      e.target.checked
                        ? [...previous, challenge]
                        : previous.filter(item => item !== challenge)
                    )
                  }}
                />
                {challenge}
              </label>
            ))}

            {completedChallenges.length === ecoChallenges.length && (
              <p style={{ color: '#286d42', fontWeight: 700 }}>
                🎉 Amazing! You completed all today's challenges!
              </p>
            )}
          </div>

        </section>

        {/* DASHBOARD STATISTICS */}
        <section className="stats-grid" id="dashboard">
          <div className="stat-card">
            <div className="stat-icon">♻</div>
            <span className="stat-label">WASTE RECORDS</span>
            <strong>{stats.total_records}</strong>
            <small>Entries logged</small>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⚖</div>
            <span className="stat-label">TOTAL QUANTITY</span>
            <strong>{Number(stats.total_quantity).toLocaleString()}</strong>
            <small>Combined quantity (units as entered)</small>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🌿</div>
            <span className="stat-label">QUIZ ATTEMPTS</span>
            <strong>{stats.quiz_attempts}</strong>
            <small>Awareness check-ins</small>
          </div>

          <div className="stat-card highlight-stat">
            <div className="stat-icon">🌍</div>
            <span className="stat-label">YOUR NEXT STEP</span>
            <strong>Sort today</strong>
            <small>Start with one item at a time</small>
          </div>
        </section>

        {/* SEGREGATION GUIDE */}
        <section className="section" id="guide">
          <div className="section-heading">
            <div>
              <div className="eyebrow">KNOW WHERE IT GOES</div>
              <h2>
                Waste segregation <em>made easy</em>
              </h2>
            </div>

            <p>
              Choose a category to see common examples and the right way to
              handle them. Local collection rules may differ.
            </p>
          </div>

          {loading ? (
            <p>Loading waste categories...</p>
          ) : (
            <>
              <div className="category-grid">
                {Object.entries(categories).map(([name, category]) => {
                  const [emoji, label] = categoryMeta[name] || ['♻', 'Waste']

                  return (
                    <button
                      type="button"
                      key={name}
                      className={`category-card ${
                        selectedCategory === name ? 'active' : ''
                      }`}
                      onClick={() => showGuide(name)}
                    >
                      <span className="category-emoji">{emoji}</span>
                      <b>{name}</b>
                      <small>{label}</small>
                    </button>
                  )
                })}
              </div>

              <div className="guide-detail">
                {selectedCategory && categories[selectedCategory] ? (
                  <div className="guide-content">
                    <div>
                      <span className="guide-pill">
                        {categories[selectedCategory].bin}
                      </span>
                      <h3 style={{ marginTop: 10 }}>
                        {selectedCategory} waste
                      </h3>
                      <p>{categories[selectedCategory].method}</p>
                    </div>

                    <div>
                      <h3>Common examples</h3>
                      <ul>
                        {categories[selectedCategory].items.map(item => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3>Remember</h3>
                      <p>{categories[selectedCategory].avoid}</p>
                    </div>
                  </div>
                ) : (
                  <div className="guide-placeholder">
                    Select a waste category above to view its disposal guide.
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        {/* WASTE LOGGING */}
        <section className="section log-section" id="log">
          <div className="section-heading">
            <div>
              <div className="eyebrow">MAKE YOUR ACTION COUNT</div>
              <h2>
                Log your <em>waste</em>
              </h2>
            </div>

            <p>
              Record the waste you have sorted. Your entries are saved in the
              application database.
            </p>
          </div>

          <div className="log-layout">
            <form className="panel form-panel" onSubmit={handleWasteSubmit}>
              <h3>Add a waste record</h3>
              <p className="muted">Fields marked * are required.</p>

              <label>Waste category *</label>
              <select
                value={form.category}
                onChange={e =>
                  setForm({ ...form, category: e.target.value })
                }
                required
              >
                <option value="">Choose category</option>
                {Object.keys(categories).map(name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              <label>Item name *</label>
              <input
                value={form.item_name}
                onChange={e =>
                  setForm({ ...form, item_name: e.target.value })
                }
                maxLength={100}
                placeholder="e.g. Plastic water bottles"
                required
              />

              <div className="two-fields">
                <div>
                  <label>Quantity *</label>
                  <input
                    type="number"
                    min="0.01"
                    max="100000"
                    step="0.01"
                    value={form.quantity}
                    onChange={e =>
                      setForm({ ...form, quantity: e.target.value })
                    }
                    placeholder="e.g. 2"
                    required
                  />
                </div>

                <div>
                  <label>Unit *</label>
                  <select
                    value={form.unit}
                    onChange={e =>
                      setForm({ ...form, unit: e.target.value })
                    }
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="g">Grams (g)</option>
                    <option value="items">Items</option>
                  </select>
                </div>
              </div>

              <label>Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={e =>
                  setForm({ ...form, notes: e.target.value })
                }
                maxLength={300}
                rows={3}
                placeholder="Any additional details..."
              />

              <button
                className="btn primary full"
                type="submit"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save waste record →'}
              </button>

              <div
                className={`form-message ${formError ? 'error' : ''}`}
                role="status"
              >
                {formMessage}
              </div>
            </form>

            <div className="panel recent-panel">
              <div className="panel-title">
                <div>
                  <h3>Recent activity</h3>
                  <p className="muted">Your latest saved entries</p>
                </div>
                <span className="live-dot">LIVE</span>
              </div>

              <div className="recent-list">
                {stats.recent.length === 0 ? (
                  <div className="empty-state">
                    No records yet. Add your first entry.
                  </div>
                ) : (
                  stats.recent.map(record => {
                    const emoji =
                      categoryMeta[record.category]?.[0] || '♻'

                    return (
                      <div className="recent-item" key={record.id}>
                        <div className="recent-left">
                          <span className="recent-emoji">{emoji}</span>
                          <div>
                            <b>{record.item_name}</b>
                            <small>
                              {record.category} ·{' '}
                              {new Date(record.created_at).toLocaleString()}
                            </small>
                          </div>
                        </div>

                        <span className="recent-qty">
                          {record.quantity} {record.unit}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </section>

        
        {/* RECYCLING CENTRES */}
        <section className="section" id="centers">
          <div className="section-heading">
            <div>
              <div className="eyebrow">RECYCLE RESPONSIBLY</div>
              <h2>
                Find recycling <em>centres</em>
              </h2>
            </div>

            <p>
              Find collection centres and discover where different types of
              waste can be recycled.
            </p>
          </div>

          <div className="panel" style={{ marginBottom: 20 }}>
            <label htmlFor="center-search">Search recycling centres</label>
            <input
              id="center-search"
              type="search"
              value={centerSearch}
              onChange={e => setCenterSearch(e.target.value)}
              placeholder="Search by centre, city or waste type..."
              style={{ width: '100%', marginTop: 8 }}
            />
            <label htmlFor="center-category" style={{ marginTop: 15 }}>
              Filter by waste category
            </label>

            <select
              id="center-category"
              value={centerCategory}
              onChange={e => setCenterCategory(e.target.value)}
              style={{ width: '100%', marginTop: 8 }}
            >
              <option value="All">All categories</option>
              <option value="E-waste">E-waste</option>
              <option value="Plastic">Plastic</option>
              <option value="Paper">Paper</option>
              <option value="Glass">Glass</option>
              <option value="Metal">Metal</option>
              <option value="Organic">Organic</option>
              <option value="Hazardous">Hazardous</option>
            </select>
          </div>
          {centerLoading ? (
            <p>Loading recycling centres...</p>
          ) : centerError ? (
            <p role="alert">{centerError}</p>
          ) : centers.length === 0 ? (
            <div className="panel empty-state">
              <h3>No recycling centres added yet</h3>
              <p>
                Verified recycling centre details will appear here once they
                are added to the database.
              </p>
            </div>
          ) : filteredCenters.length === 0 ? (
            <div className="panel empty-state">
              <h3>No matching centres found</h3>
              <p>Try searching with another centre name, city or waste category.</p>
            </div>
          ) : (
            <div className="category-grid">
              {filteredCenters.map(center => (
                <div className="panel" key={center.id}>
                  <h3>{center.name}</h3>
                  <p className="muted">
                    {center.address}, {center.city}, {center.state}
                    {center.postal_code
                      ? ` - ${center.postal_code}`
                      : ''}
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${center.name}, ${center.address}, ${center.city}, ${center.state}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-link"
                  >
                    View location on Google Maps ↗
                  </a>

                  <p>
                    <strong>Accepted waste:</strong>{' '}
                    {center.accepted_categories || 'Contact centre'}
                  </p>

                  {center.phone && (
                    <p>
                      <strong>Phone:</strong> {center.phone}
                    </p>
                  )}

                  {center.website && (
                    <p>
                      <a href={center.website} target="_blank" rel="noreferrer">
                        Visit website ↗
                      </a>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* LEARNING ZONE */}
        <section className="section" id="learn">
          <div className="section-heading">
            <div>
              <div className="eyebrow">GROW YOUR GREEN KNOWLEDGE</div>
              <h2>Explore the <em>Learning Zone</em></h2>
            </div>
            <p>Discover simple ways to reduce waste and protect the environment.</p>
          </div>

          <div className="category-grid">
            {[
              {
                icon: '♻️',
                title: 'Reduce, Reuse, Recycle',
                description: 'Learn the 3Rs and how they help reduce waste.',
                tip: 'Carry reusable bags and bottles instead of choosing single-use products.'
              },
              {
                icon: '🌱',
                title: 'Composting',
                description: 'Understand how organic waste becomes useful compost.',
                tip: 'Fruit peels and vegetable scraps can be composted using a suitable composting method.'
              },
              {
                icon: '🔋',
                title: 'E-waste Awareness',
                description: 'Learn why electronic waste needs special handling.',
                tip: 'Never put batteries and electronic devices into ordinary household bins.'
              },
              {
                icon: '💧',
                title: 'Save Resources',
                description: 'Discover ways to conserve water and energy.',
                tip: 'Switch off unused lights and close taps when not in use.'
              },
              {
                icon: '🌍',
                title: 'Plastic Pollution',
                description: 'Understand the impact of plastic on the environment.',
                tip: 'Avoid unnecessary single-use plastics and follow local recycling rules.'
              },
              {
                icon: '📦',
                title: 'Smart Segregation',
                description: 'Learn why separating waste at source matters.',
                tip: 'Keep dry, wet and hazardous waste separate according to local collection rules.'
              }
            ].map((lesson, index) => (
              <div className="panel" key={index}>
                <div style={{ fontSize: 32 }}>{lesson.icon}</div>
                <h3>{lesson.title}</h3>
                <p className="muted">{lesson.description}</p>
                <details>
                  <summary style={{ cursor: 'pointer', color: '#286d42' }}>
                    Read learning tip
                  </summary>
                  <p>{lesson.tip}</p>
                </details>
              </div>
            ))}
          </div>
        </section>

        {/* QUIZ */}
        <section className="section quiz-section" id="quiz">
          <div className="quiz-intro">
            <div className="eyebrow">LEARN BY DOING</div>

            <h2>
              How much do you
              <br />
              <em>know about recycling?</em>
            </h2>

            <p>
              Try this quick five-question quiz and check your waste-sorting
              knowledge.
            </p>

            <div className="quiz-badge">
              🌱 5 QUESTIONS · INSTANT RESULT
            </div>
          </div>

          <div className="panel quiz-panel">
            {!completed ? (
              <>
                <div className="quiz-top">
                  <span>
                    QUESTION {questionIndex + 1} OF {quizQuestions.length}
                  </span>

                  <div className="progress">
                    <span
                      id="progress-fill"
                      style={{
                        width: `${((questionIndex + 1) / quizQuestions.length) * 100}%`
                      }}
                    />
                  </div>
                </div>

                <h3>{currentQuestion.q}</h3>

                <div className="answer-options">
                  {currentQuestion.a.map((answer, index) => (
                    <button
                      key={answer}
                      type="button"
                      className={`answer-option ${
                        answered && index === currentQuestion.correct
                          ? 'selected'
                          : ''
                      }`}
                      disabled={answered}
                      onClick={() => selectAnswer(index)}
                    >
                      {answer}
                    </button>
                  ))}
                </div>

                <div className="quiz-bottom">
                  <span id="quiz-feedback">
                    {answered
                      ? `${selectedAnswer === currentQuestion.correct ? 'Correct! ' : 'Not quite. '}${currentQuestion.explain}`
                      : ''}
                  </span>

                  <button
                    className="btn primary"
                    disabled={!answered}
                    onClick={nextQuestion}
                    type="button"
                  >
                    {questionIndex === quizQuestions.length - 1
                      ? 'See result →'
                      : 'Next question →'}
                  </button>
                </div>
              </>
            ) : (
              <div className="quiz-result">
                <strong>
                  {score} / {quizQuestions.length}
                </strong>

                <p>
                  {score === 5
                    ? 'Excellent! You know your recycling basics.'
                    : score >= 3
                      ? 'Good effort! Keep learning and sorting carefully.'
                      : 'Keep practising. Every new fact helps you sort waste better.'}
                </p>

                <label>Your name (optional)</label>
                <input
                  value={quizName}
                  onChange={e => setQuizName(e.target.value)}
                  maxLength={60}
                  placeholder="Enter your name"
                />

                <button
                  className="btn primary"
                  type="button"
                  onClick={saveQuiz}
                  disabled={quizSaving}
                >
                  {quizSaving ? 'Saving...' : 'Save quiz result'}
                </button>

                <span>{quizMessage}</span>

                <button
                  className="btn"
                  type="button"
                  onClick={retryQuiz}
                  style={{
                    marginTop: 8,
                    background: '#edf5ed',
                    color: '#286d42'
                  }}
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        </section>

        {/* BOTTOM BANNER */}
        <section className="bottom-banner">
          <div className="banner-leaf">🌳</div>

          <div>
            <div className="eyebrow">A CLEANER FUTURE STARTS HERE</div>
            <h2>
              Be part of the <em>solution.</em>
            </h2>
            <p>
              Reduce what you use. Reuse what you can. Recycle what is accepted
              locally.
            </p>
          </div>

          <a className="btn light" href="#log">
            Record your action ↗
          </a>
        </section>
      </main>

      {/* FOOTER */}
      <footer>
        <a className="brand footer-brand" href="#">
          <span className="brand-mark">♻</span>
          <span>
            EcoSort
            <small>WASTE AWARENESS</small>
          </span>
        </a>

        <span>Learn · Segregate · Recycle</span>
        <span>Built for a greener tomorrow © 2026</span>
      </footer>
    </>
  )
}

export default App
