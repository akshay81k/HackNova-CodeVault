import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';
import InteractiveBackground from '../components/InteractiveBackground';
import {
  ArrowLeft, Search, FileCode, AlertTriangle,
  CheckCircle, XCircle, ChevronDown, ChevronUp,
  FileText, Layers, BarChart3
} from 'lucide-react';

export default function PlagiarismCheckPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedA, setSelectedA] = useState('');
  const [selectedB, setSelectedB] = useState('');
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [expandedFile, setExpandedFile] = useState(null);
  const [eventTitle, setEventTitle] = useState('');

  useEffect(() => {
    loadSubmissions();
  }, [eventId]);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/submissions/event/${eventId}`);
      setSubmissions(data.submissions || []);
    } catch (err) {
      setError('Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!selectedA || !selectedB) {
      setError('Please select both Team A and Team B.');
      return;
    }
    if (selectedA === selectedB) {
      setError('Cannot compare a submission with itself. Please select two different teams.');
      return;
    }

    setError('');
    setResult(null);
    setComparing(true);

    try {
      const { data } = await API.post('/submissions/compare', {
        submissionIdA: selectedA,
        submissionIdB: selectedB,
      });
      setResult(data.comparison);
      setEventTitle(data.comparison.eventTitle || '');
    } catch (err) {
      setError(err.response?.data?.message || 'Comparison failed. Please try again.');
    } finally {
      setComparing(false);
    }
  };

  const getSimColor = (pct) => {
    if (pct >= 60) return 'var(--accent-red)';
    if (pct >= 30) return 'var(--accent-amber)';
    return 'var(--accent-green)';
  };

  const getSimBg = (pct) => {
    if (pct >= 60) return 'rgba(239,68,68,0.12)';
    if (pct >= 30) return 'rgba(245,158,11,0.12)';
    return 'rgba(16,185,129,0.12)';
  };

  const getSimLabel = (pct) => {
    if (pct >= 70) return 'High Risk';
    if (pct >= 50) return 'Suspicious';
    if (pct >= 30) return 'Moderate';
    return 'Low';
  };

  const getSimIcon = (pct) => {
    if (pct >= 60) return <XCircle size={14} />;
    if (pct >= 30) return <AlertTriangle size={14} />;
    return <CheckCircle size={14} />;
  };

  // Group submissions by team (latest per team)
  const teamMap = {};
  submissions.forEach(s => {
    const key = s.teamId || s._id;
    if (!teamMap[key] || new Date(s.createdAt) > new Date(teamMap[key].createdAt)) {
      teamMap[key] = s;
    }
  });
  const teams = Object.values(teamMap);

  return (
    <div className="page-wrapper" style={{ position: 'relative', zIndex: 1 }}>
      <InteractiveBackground />
      <Navbar />
      <div className="dashboard-main">

        {/* Back button + header */}
        <div style={{ marginBottom: 28 }}>
          <button
            className="btn btn-ghost"
            style={{ marginBottom: 12, paddingLeft: 0, gap: 6 }}
            onClick={() => navigate('/organizer')}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-md)',
              background: 'rgba(139,92,246,0.12)', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <Search size={20} color="var(--accent-purple)" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>
                Plagiarism Detection
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 2 }}>
                Token-based code similarity analysis · Compare any two team submissions
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : (
          <>
            {/* Team Selection Card */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header" style={{ marginBottom: 16 }}>
                <div className="card-title">
                  <Layers size={18} color="var(--accent-blue-light)" /> Select Teams to Compare
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {teams.length} team{teams.length !== 1 ? 's' : ''} available
                </span>
              </div>

              <div className="plag-selectors">
                {/* Team A */}
                <div className="plag-selector-col">
                  <label className="form-label" style={{ color: 'var(--accent-blue-light)' }}>
                    🅰️ Team A
                  </label>
                  <select
                    id="plag-team-a"
                    className="form-select"
                    value={selectedA}
                    onChange={e => setSelectedA(e.target.value)}
                  >
                    <option value="">— Select submission —</option>
                    {teams.map(s => (
                      <option key={s._id} value={s._id}>
                        {s.teamName || s.teamId} ({s.teamId})
                      </option>
                    ))}
                  </select>
                </div>

                {/* VS */}
                <div className="plag-vs">VS</div>

                {/* Team B */}
                <div className="plag-selector-col">
                  <label className="form-label" style={{ color: 'var(--accent-purple)' }}>
                    🅱️ Team B
                  </label>
                  <select
                    id="plag-team-b"
                    className="form-select"
                    value={selectedB}
                    onChange={e => setSelectedB(e.target.value)}
                  >
                    <option value="">— Select submission —</option>
                    {teams.map(s => (
                      <option key={s._id} value={s._id}>
                        {s.teamName || s.teamId} ({s.teamId})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <div className="alert alert-error" style={{ marginTop: 16 }}>
                  ⚠️ {error}
                </div>
              )}

              <button
                id="plag-compare-btn"
                className="btn btn-primary btn-lg btn-full"
                style={{ marginTop: 20 }}
                disabled={comparing || !selectedA || !selectedB}
                onClick={handleCompare}
              >
                {comparing ? (
                  <>
                    <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                    Analyzing code similarity…
                  </>
                ) : (
                  <>
                    <Search size={18} /> Compare Submissions
                  </>
                )}
              </button>
            </div>

            {/* Results */}
            {result && (
              <div style={{ animation: 'fadeInUp 0.4s ease' }}>
                {/* Overall Score */}
                <div className="card" style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
                    {/* Circular gauge */}
                    <div className="plag-gauge-wrapper">
                      <svg className="plag-gauge" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="52" fill="none"
                          stroke="var(--border)" strokeWidth="8" />
                        <circle cx="60" cy="60" r="52" fill="none"
                          stroke={getSimColor(result.overallSimilarity)}
                          strokeWidth="8"
                          strokeDasharray={`${result.overallSimilarity * 3.267} 326.7`}
                          strokeLinecap="round"
                          transform="rotate(-90 60 60)"
                          style={{ transition: 'stroke-dasharray 1s ease' }}
                        />
                      </svg>
                      <div className="plag-gauge-label">
                        <span className="plag-gauge-value" style={{ color: getSimColor(result.overallSimilarity) }}>
                          {result.overallSimilarity}%
                        </span>
                        <span className="plag-gauge-text">Similarity</span>
                      </div>
                    </div>

                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '4px 14px', borderRadius: 20,
                        background: getSimBg(result.overallSimilarity),
                        color: getSimColor(result.overallSimilarity),
                        fontWeight: 700, fontSize: '0.82rem', marginBottom: 12
                      }}>
                        {getSimIcon(result.overallSimilarity)}
                        {getSimLabel(result.overallSimilarity)}
                      </div>

                      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 12 }}>
                        Overall Similarity Score
                      </h2>

                      <div className="plag-meta-grid">
                        <div className="plag-meta-item">
                          <span className="plag-meta-label">Team A</span>
                          <span className="plag-meta-value" style={{ color: 'var(--accent-blue-light)' }}>
                            {result.teamA.name || result.teamA.id}
                          </span>
                          <span className="plag-meta-sub">{result.teamAFiles} source files</span>
                        </div>
                        <div className="plag-meta-item">
                          <span className="plag-meta-label">Team B</span>
                          <span className="plag-meta-value" style={{ color: 'var(--accent-purple)' }}>
                            {result.teamB.name || result.teamB.id}
                          </span>
                          <span className="plag-meta-sub">{result.teamBFiles} source files</span>
                        </div>
                        <div className="plag-meta-item">
                          <span className="plag-meta-label">File Matches</span>
                          <span className="plag-meta-value">{result.fileMatches.length}</span>
                          <span className="plag-meta-sub">pairs above threshold</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* File Matches */}
                {result.fileMatches.length > 0 && (
                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">
                        <BarChart3 size={18} color="var(--accent-cyan)" /> File-by-File Comparison
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Sorted by similarity (highest first)
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {result.fileMatches.map((match, idx) => (
                        <div
                          key={idx}
                          className="plag-file-card"
                          style={{ borderLeftColor: getSimColor(match.similarity) }}
                        >
                          <div
                            className="plag-file-header"
                            onClick={() => setExpandedFile(expandedFile === idx ? null : idx)}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="plag-file-names">
                                <span className="plag-file-name" title={match.fileA}>
                                  <FileCode size={13} style={{ flexShrink: 0 }} />
                                  {match.fileA}
                                </span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', flexShrink: 0 }}>↔</span>
                                <span className="plag-file-name" title={match.fileB}>
                                  <FileText size={13} style={{ flexShrink: 0 }} />
                                  {match.fileB}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                              {/* Sim bar */}
                              <div className="plag-sim-bar-wrapper">
                                <div
                                  className="plag-sim-bar-fill"
                                  style={{
                                    width: `${Math.min(match.similarity, 100)}%`,
                                    background: getSimColor(match.similarity)
                                  }}
                                />
                              </div>

                              {/* Sim badge */}
                              <span className="plag-sim-badge" style={{
                                background: getSimBg(match.similarity),
                                color: getSimColor(match.similarity),
                              }}>
                                {match.similarity}%
                              </span>

                              {expandedFile === idx
                                ? <ChevronUp size={14} color="var(--text-muted)" />
                                : <ChevronDown size={14} color="var(--text-muted)" />}
                            </div>
                          </div>

                          {/* Expanded detail */}
                          {expandedFile === idx && (
                            <div className="plag-file-detail">
                              <div className="plag-detail-grid">
                                <div className="plag-detail-item">
                                  <span className="plag-detail-label">Cosine Similarity</span>
                                  <span className="plag-detail-value">{match.cosine}%</span>
                                </div>
                                <div className="plag-detail-item">
                                  <span className="plag-detail-label">Jaccard Index</span>
                                  <span className="plag-detail-value">{match.jaccard}%</span>
                                </div>
                                <div className="plag-detail-item">
                                  <span className="plag-detail-label">Common Tokens</span>
                                  <span className="plag-detail-value">{match.commonTokenCount}</span>
                                </div>
                                <div className="plag-detail-item">
                                  <span className="plag-detail-label">Tokens A / B</span>
                                  <span className="plag-detail-value">{match.tokensA} / {match.tokensB}</span>
                                </div>
                                <div className="plag-detail-item">
                                  <span className="plag-detail-label">Lines A</span>
                                  <span className="plag-detail-value">{match.linesA}</span>
                                </div>
                                <div className="plag-detail-item">
                                  <span className="plag-detail-label">Lines B</span>
                                  <span className="plag-detail-value">{match.linesB}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.fileMatches.length === 0 && (
                  <div className="card">
                    <div className="empty-state" style={{ padding: '40px 20px' }}>
                      <div className="empty-state-icon">✅</div>
                      <div className="empty-state-title">No significant code overlap detected</div>
                      <div className="empty-state-desc">
                        The submissions appear to be independently written with no substantial code similarity above the detection threshold.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
