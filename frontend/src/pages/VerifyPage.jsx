import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';
import InteractiveBackground from '../components/InteractiveBackground';
import { Search, Upload, Hash, Copy, CheckCircle, XCircle, FileDiff, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function VerifyPage() {
    const [mode, setMode] = useState('file'); // 'file' | 'hash' | 'lookup' | 'changes'
    const [verificationId, setVerificationId] = useState('');
    const [file, setFile] = useState(null);
    const [hashString, setHashString] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [dragging, setDragging] = useState(false);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const idParam = searchParams.get('id');
        if (idParam) {
            setVerificationId(idParam);
            setMode('lookup');
            performLookup(idParam);
        }
    }, []);

    const formatDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'long' });
    const formatBytes = (b) => b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';

    const handleFileVerify = async (e) => {
        e.preventDefault();
        if (!file || !verificationId.trim()) return setError('Please provide both the Verification ID and the file.');
        setError('');
        setResult(null);
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('verificationId', verificationId.trim());
            const { data } = await API.post('/verify/file', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setResult(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleChangesVerify = async (e) => {
        e.preventDefault();
        if (!file || !verificationId.trim()) return setError('Please provide both the Verification ID and the ZIP file.');
        setError('');
        setResult(null);
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('verificationId', verificationId.trim());
            const { data } = await API.post('/verify/verify-changes', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setResult({ isChangeReport: true, ...data });
        } catch (err) {
            setError(err.response?.data?.message || 'Change detection failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleHashVerify = async (e) => {
        e.preventDefault();
        if (!verificationId.trim() || !hashString.trim()) return setError('Please provide both the Verification ID and hash string.');
        setError('');
        setResult(null);
        setLoading(true);
        try {
            const { data } = await API.post('/verify/hash', { verificationId: verificationId.trim(), hashString: hashString.trim() });
            setResult(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed.');
        } finally {
            setLoading(false);
        }
    };

    const performLookup = async (idToLookup) => {
        const id = typeof idToLookup === 'string' ? idToLookup : verificationId.trim();
        if (!id) return;
        setError('');
        setResult(null);
        setLoading(true);
        try {
            const { data } = await API.get(`/verify/${id}`);
            setResult({ isLookupOnly: true, ...data });
        } catch (err) {
            setError(err.response?.data?.message || 'No record found.');
        } finally {
            setLoading(false);
        }
    };

    const handleLookup = async () => {
        await performLookup(verificationId.trim());
    };

    const copy = (t) => navigator.clipboard.writeText(t);

    const reset = () => {
        setResult(null);
        setError('');
        setFile(null);
        setHashString('');
    };

    const exportToPDF = () => {
        try {
            console.log("Starting PDF Export...", result);
            if (!result) return;
            
            const doc = new jsPDF();
            
            const primaryColor = [14, 165, 233];
            const textColor = [30, 41, 59];
            const lightText = [100, 116, 139];
            
            let yPos = 20;

            doc.setFontSize(22);
            doc.setTextColor(...primaryColor);
            doc.setFont("helvetica", "bold");
            doc.text("Hackathon Submission Verification Report", 14, yPos);
            
            doc.setFontSize(10);
            doc.setTextColor(...lightText);
            doc.setFont("helvetica", "normal");
            yPos += 8;
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, yPos);
            
            const refId = result.details?.verificationId || verificationId || "N/A";
            doc.text(`Verification ID: ${refId}`, 196, yPos, { align: "right" });
            
            yPos += 15;
            
            const addSectionTitle = (title) => {
                doc.setFontSize(14);
                doc.setTextColor(...primaryColor);
                doc.setFont("helvetica", "bold");
                doc.text(title, 14, yPos);
                yPos += 2;
                doc.setDrawColor(226, 232, 240);
                doc.line(14, yPos, 196, yPos);
                yPos += 8;
            };

            addSectionTitle("Event Details & Participant Information");
            
            const detailsData = [
                ["Event Title", result.details?.eventTitle || "-"],
                ["Team / Participant", result.details?.teamName || result.details?.submittedBy || "-"],
                ["Original File Name", result.details?.originalFileName || "-"],
                ["File Size", result.details?.fileSize ? formatBytes(result.details?.fileSize) : "-"],
                ["Submission Time", result.details?.submissionTime ? formatDate(result.details?.submissionTime) : "-"],
                ["Deadline Status", result.details?.submittedBeforeDeadline ? "On-Time" : "Late"]
            ];

            autoTable(doc, {
                startY: yPos,
                body: detailsData,
                theme: 'grid',
                styles: { fontSize: 10, cellPadding: 5, textColor: textColor },
                columnStyles: { 0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 50 } },
                margin: { left: 14, right: 14 },
                didDrawPage: (data) => {
                    yPos = data.cursor.y;
                }
            });
            
            yPos = (doc.lastAutoTable ? doc.lastAutoTable.finalY : yPos) + 15;

            if (!result.isChangeReport && !result.isLookupOnly) {
                if (yPos > 250) { doc.addPage(); yPos = 20; }
                addSectionTitle("Blockchain Integrity Check");
                
                autoTable(doc, {
                    startY: yPos,
                    body: [
                        ["Expected Hash", result.details?.expectedHash || "-"],
                        ["Provided Hash", result.details?.providedHash || "-"],
                        ["Status", result.isMatch ? "SUCCESS (Hashes Match)" : "FAILED (Hash Mismatch)"]
                    ],
                    theme: 'grid',
                    styles: { fontSize: 10, cellPadding: 5, textColor: textColor },
                    columnStyles: { 
                        0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 50 },
                        1: { font: 'courier', fontSize: 9, cellWidth: 'wrap' }
                    },
                    margin: { left: 14, right: 14 }
                });
                yPos = (doc.lastAutoTable ? doc.lastAutoTable.finalY : yPos) + 15;
            }

            if (result.isChangeReport && result.report) {
                if (yPos > 240) { doc.addPage(); yPos = 20; }
                addSectionTitle("File Change Summary");

                autoTable(doc, {
                    startY: yPos,
                    head: [["Modified Files", "Added Files", "Deleted Files"]],
                    body: [[
                        result.report.modified?.length || 0,
                        result.report.added?.length || 0,
                        result.report.deleted?.length || 0
                    ]],
                    theme: 'grid',
                    headStyles: { fillColor: [241, 245, 249], textColor: textColor, halign: 'center' },
                    bodyStyles: { halign: 'center', fontSize: 12, fontStyle: 'bold' },
                    margin: { left: 14, right: 14 }
                });
                yPos = (doc.lastAutoTable ? doc.lastAutoTable.finalY : yPos) + 15;

                const printList = (title, items, color) => {
                    if (!items || items.length === 0) return;
                    if (yPos > 240) { doc.addPage(); yPos = 20; }
                    addSectionTitle(title);
                    autoTable(doc, {
                        startY: yPos,
                        body: items.map(f => [f]),
                        theme: 'plain',
                        styles: { font: 'courier', fontSize: 9, textColor: color },
                        margin: { left: 14, right: 14 }
                    });
                    yPos = (doc.lastAutoTable ? doc.lastAutoTable.finalY : yPos) + 10;
                };

                printList("Modified Files", result.report.modified, [245, 158, 11]);
                printList("Added Files", result.report.added, [16, 185, 129]);
                printList("Deleted Files", result.report.deleted, [239, 68, 68]);
            }

            if (yPos > 240) { doc.addPage(); yPos = 20; }
            addSectionTitle("Verification Conclusion");
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(...textColor);
            
            let conclusionText = "";
            if (!result.isChangeReport && !result.isLookupOnly) {
                if (result.isMatch) {
                    conclusionText = "The provided file is authentic and matches the original submission perfectly. The cryptographic hash recalculation aligns with the blockchain record, confirming that no modifications or tampering have occurred since the original submission timestamp.";
                } else {
                    conclusionText = "WARNING: The provided file does NOT match the original submission. The cryptographic hash recalculation differs from the blockchain record, indicating that the file is not authentic or has been modified/tampered with since the original submission timestamp.";
                }
            } else if (result.isChangeReport) {
                const added = result.report?.added?.length || 0;
                const deleted = result.report?.deleted?.length || 0;
                const modified = result.report?.modified?.length || 0;
                if (added === 0 && deleted === 0 && modified === 0) {
                    conclusionText = "The provided project is completely identical to the original submission. Total changes detected: 0. The integrity of the project is intact.";
                } else {
                    conclusionText = `File differences were detected between the verified project and the original submission. A total of ${modified} modifications, ${added} additions, and ${deleted} deletions were found. Please review the detailed file lists above to understand the scope of the changes.`;
                }
            } else {
                 conclusionText = "This is a public record lookup. No file integrity check or comparison was performed. The data above represents the stored submission metadata on the blockchain.";
            }
            
            const textLines = doc.splitTextToSize(conclusionText, 168);
            doc.text(textLines, 14, yPos);

            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(9);
                doc.setTextColor(148, 163, 184);
                doc.setFont("helvetica", "italic");
                doc.text("Generated by CodeVault Verification System", 14, 290);
                doc.text(`Page ${i} of ${pageCount}`, 196, 290, { align: "right" });
            }

            doc.save(`Verification_Report_${refId}.pdf`);
        } catch (err) {
            console.error("PDF Export Error:", err);
            setError("Failed to generate PDF. Error: " + err.message);
        }
    };

    return (
        <div className="page-wrapper" style={{ position: 'relative', zIndex: 1 }}>
            <InteractiveBackground />
            <Navbar />
            <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 10 }}>Verify Submission</h1>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto' }}>
                        Judges and organizers can independently verify the integrity of any submission.
                    </p>
                </div>

                {/* Mode Tabs */}
                <div className="tabs" style={{ marginBottom: 28 }}>
                    <button className={`tab ${mode === 'file' ? 'active' : ''}`} onClick={() => { setMode('file'); reset(); }}>
                        📁 Upload
                    </button>
                    <button className={`tab ${mode === 'changes' ? 'active' : ''}`} onClick={() => { setMode('changes'); reset(); }}>
                        📉 Changes
                    </button>
                    <button className={`tab ${mode === 'hash' ? 'active' : ''}`} onClick={() => { setMode('hash'); reset(); }}>
                        🔢 Hash
                    </button>
                    <button className={`tab ${mode === 'lookup' ? 'active' : ''}`} onClick={() => { setMode('lookup'); reset(); }}>
                        🔍 Lookup
                    </button>
                </div>

                {/* Error */}
                {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>⚠️ {error}</div>}

                {/* Result */}
                {result && !result.isLookupOnly && !result.isChangeReport && (
                    <div className={`verify-result animate-scale-in ${result.isMatch ? 'match' : 'mismatch'}`} style={{ marginBottom: 24 }}>
                        <div className="verify-icon">{result.isMatch ? '✅' : '❌'}</div>
                        <div className={`verify-status ${result.isMatch ? 'match' : 'mismatch'}`}>
                            {result.result}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.9rem' }}>
                            {result.isMatch
                                ? 'The file is authentic. Its hash matches the original submission.'
                                : 'Hash mismatch detected. The file may have been modified after submission.'}
                        </div>

                        {result.details && (
                            <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', padding: 20 }}>
                                {[
                                    ['Verification ID', result.details.verificationId],
                                    ['Event', result.details.eventTitle],
                                    ['Submitted By', result.details.submittedBy],
                                    ['Team', result.details.teamName],
                                    ['Submission Time', formatDate(result.details.submissionTime)],
                                    ['Deadline Status', result.details.submittedBeforeDeadline ? '✅ On-time' : '❌ Late'],
                                    ['Expected Hash', result.details.expectedHash],
                                    ['Provided Hash', result.details.providedHash],
                                ].map(([label, value]) => (
                                    <div key={label} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                                        <span className={label.includes('Hash') ? 'mono' : ''} style={{ fontSize: '0.8rem', color: 'var(--text-primary)', wordBreak: 'break-all', textAlign: 'right' }}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => exportToPDF()}><Download size={18} /> Export Report</button>
                            <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={reset}>🔄 Verify Another</button>
                        </div>
                    </div>
                )}

                {/* Change Report Result */}
                {result?.isChangeReport && (
                    <div className="card animate-scale-in" style={{ marginBottom: 24, borderLeft: '4px solid var(--accent-blue)', boxShadow: 'var(--shadow-glow)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <div style={{ fontSize: '1.5rem' }}>📊</div>
                            <div>
                                <div style={{ fontWeight: 800 }}>File Change Report</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{result.details.teamName} · {result.details.originalFileName}</div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
                            <div style={{ background: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444' }}>{result.report.modified.length}</div>
                                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, opacity: 0.8 }}>Modified</div>
                            </div>
                            <div style={{ background: 'rgba(16,185,129,0.1)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>{result.report.added.length}</div>
                                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, opacity: 0.8 }}>Added</div>
                            </div>
                            <div style={{ background: 'rgba(107,114,128,0.1)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#9ca3af' }}>{result.report.deleted.length}</div>
                                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, opacity: 0.8 }}>Deleted</div>
                            </div>
                        </div>

                        {/* List changed files */}
                        {['modified', 'added', 'deleted'].map(type => (
                            result.report[type].length > 0 && (
                                <div key={type} style={{ marginBottom: 20 }}>
                                    <h3 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: type === 'modified' ? '#f59e0b' : type === 'added' ? '#10b981' : '#ef4444', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {type === 'modified' ? '⚠️' : type === 'added' ? '➕' : '🗑️'} {type} Files
                                    </h3>
                                    <div style={{ maxHeight: 200, overflowY: 'auto', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', padding: 10 }}>
                                        {result.report[type].map(f => (
                                            <div key={f} className="mono" style={{ fontSize: '0.75rem', padding: '6px 4px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>{f}</div>
                                        ))}
                                    </div>
                                </div>
                            )
                        ))}

                        {result.report.modified.length === 0 && result.report.added.length === 0 && result.report.deleted.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--accent-green)', fontWeight: 600 }}>
                                ✅ No changes detected! Project is identical to submission.
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => exportToPDF()}><Download size={18} /> Export Report</button>
                            <button className="btn btn-secondary btn-full" style={{ flex: 1, justifyContent: 'center' }} onClick={reset}>🔄 Run New Comparison</button>
                        </div>
                    </div>
                )}

                {/* Lookup Result */}
                {result?.isLookupOnly && (
                    <div className="card" style={{ marginBottom: 24, borderColor: 'var(--accent-blue)', boxShadow: 'var(--shadow-glow)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <div style={{ fontSize: '1.5rem' }}>📋</div>
                            <div>
                                <div style={{ fontWeight: 800 }}>Submission Record Found</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Lookup only · No file comparison performed</div>
                            </div>
                        </div>
                        {result.record && Object.entries({
                            'Verification ID': result.record.verificationId,
                            'Event': result.record.eventTitle,
                            'Submitted By': result.record.submittedBy,
                            'Team': result.record.teamName,
                            'File Name': result.record.originalFileName,
                            'File Size': formatBytes(result.record.fileSize),
                            'Submission Time': formatDate(result.record.submissionTime),
                            'Deadline Status': result.record.submittedBeforeDeadline ? '✅ On-time' : '❌ Late',
                            'SHA-256 Hash': result.record.sha256Hash,
                        }).map(([label, value]) => (
                            <div key={label} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>{label}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {label === 'SHA-256 Hash' ? (
                                        <div className="hash-display" onClick={() => copy(value)} style={{ fontSize: '0.72rem' }}>{value}</div>
                                    ) : (
                                        <span style={{ fontSize: '0.875rem', textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
                                    )}
                                    {(label.includes('Hash') || label === 'Verification ID') && (
                                        <button className="btn btn-ghost btn-sm" onClick={() => copy(value)}><Copy size={12} /></button>
                                    )}
                                </div>
                            </div>
                        ))}
                        <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={reset}>🔄 New Lookup</button>
                    </div>
                )}

                {/* Forms */}
                {!result && (
                    <div className="card">
                        {/* Shared V-ID field */}
                        <div className="form-group">
                            <label className="form-label">Verification ID</label>
                            <input
                                id="verify-id"
                                type="text"
                                className="form-input"
                                placeholder="HN-XXXXXXXXXXXX"
                                value={verificationId}
                                onChange={e => setVerificationId(e.target.value.toUpperCase())}
                                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}
                            />
                        </div>

                        {(mode === 'file' || mode === 'changes') && (
                            <form onSubmit={mode === 'file' ? handleFileVerify : handleChangesVerify}>
                                <div className="form-group">
                                    <label className="form-label">Upload Project ZIP</label>
                                    <div
                                        className={`upload-zone ${dragging ? 'dragging' : ''}`}
                                        style={{ padding: '28px 20px' }}
                                        onDragOver={e => { e.preventDefault(); setDragging(true); }}
                                        onDragLeave={() => setDragging(false)}
                                        onDrop={e => { e.preventDefault(); setDragging(false); setFile(e.dataTransfer.files[0]); }}
                                        onClick={() => document.getElementById('verify-file').click()}
                                    >
                                        <input id="verify-file" type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
                                        {file ? (
                                            <>
                                                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📦</div>
                                                <div style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{file.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{formatBytes(file.size)}</div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ fontSize: '2rem', marginBottom: 8 }}>☁️</div>
                                                <div style={{ fontWeight: 600 }}>Drop ZIP or click to upload</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                                    {mode === 'changes' ? 'Detect changes from original' : 'Verify project integrity'}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <button id="verify-submit-btn" type="submit" className="btn btn-primary btn-full" disabled={loading || !file || !verificationId.trim()}>
                                    {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Processing...</> :
                                        mode === 'changes' ? <><FileDiff size={15} /> Detect Changes</> : <><Upload size={15} /> Compare & Verify</>}
                                </button>
                            </form>
                        )}

                        {mode === 'hash' && (
                            <form onSubmit={handleHashVerify}>
                                <div className="form-group">
                                    <label className="form-label">SHA-256 Hash String</label>
                                    <input
                                        id="hash-input"
                                        type="text"
                                        className="form-input"
                                        placeholder="64-character hex string..."
                                        value={hashString}
                                        onChange={e => setHashString(e.target.value)}
                                        style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
                                    />
                                </div>
                                <button id="hash-verify-btn" type="submit" className="btn btn-primary btn-full" disabled={loading || !hashString.trim() || !verificationId.trim()}>
                                    {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Verifying...</> : <><Hash size={15} /> Verify Hash</>}
                                </button>
                            </form>
                        )}

                        {mode === 'lookup' && (
                            <div>
                                <div className="alert alert-info" style={{ marginBottom: 16 }}>
                                    ℹ️ Lookup only displays the stored record — no integrity check is performed.
                                </div>
                                <button id="lookup-btn" className="btn btn-primary btn-full" onClick={handleLookup} disabled={loading || !verificationId.trim()}>
                                    {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Looking up...</> : <><Search size={15} /> Lookup Record</>}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* How it works */}
                {!result && (
                    <div className="card" style={{ marginTop: 20 }}>
                        <div style={{ fontWeight: 700, marginBottom: 14, fontSize: '0.9rem' }}>Verification Capabilities</div>
                        {[
                            ['1', 'Integrity', 'Check if a ZIP file is identical to the original submission using SHA-256 hashing.'],
                            ['2', 'Change Detection', 'Detect exactly which files were modified, added, or deleted since the submission.'],
                            ['3', 'Public Record', 'Lookup submission metadata and trusted timestamps using only a Verification ID.'],
                        ].map(([num, title, desc]) => (
                            <div key={num} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-blue)', flexShrink: 0 }}>{num}</div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 2 }}>{title}</div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
