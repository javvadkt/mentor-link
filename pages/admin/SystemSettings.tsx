
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Spinner } from '../../components/Spinner';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { SupabaseService } from '../../services/supabaseService';
import { InvitationCode } from '../../types';

// New component for Bulk Add Mentees
const BulkAddMentees: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<{ successes: number; failures: { data: any; error: string }[] } | null>(null);
    const [error, setError] = useState('');
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setError('');
            setResults(null);
        }
    };

    const parseCSV = (text: string): { header: string[], rows: any[] } => {
        const lines = text.trim().replace(/\r/g, '').split('\n');
        if (lines.length === 0 || lines[0].trim() === '') {
            return { header: [], rows: [] };
        }
        const header = lines[0].split(',').map(h => h.trim());
        const rows = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            const rowObject = header.reduce((obj, nextKey, index) => {
                obj[nextKey] = values[index];
                return obj;
            }, {} as any);
            return rowObject;
        });
        return { header, rows };
    };

    const handleUpload = () => {
        if (!file) {
            setError('Please select a CSV file to upload.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            setLoading(true);
            setError('');
            setResults(null);
            try {
                const text = event.target?.result as string;
                const { header, rows } = parseCSV(text);

                // Validate header
                const requiredColumns = ['name', 'username', 'password', 'adno', 'class', 'mentor_username'];
                const missingColumns = requiredColumns.filter(col => !header.includes(col));
                if (missingColumns.length > 0) {
                    throw new Error(`CSV file is missing required columns: ${missingColumns.join(', ')}`);
                }

                if (rows.length === 0) {
                    throw new Error('CSV file contains no data rows.');
                }
                
                const uploadResults = await SupabaseService.bulkAddMentees(rows);
                setResults(uploadResults);

            } catch (err: any) {
                setError(err.message || 'An unexpected error occurred during parsing or upload.');
            } finally {
                setLoading(false);
                // Reset file input
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                setFile(null);
            }
        };

        reader.onerror = () => {
            setError('Failed to read the file.');
            setLoading(false);
        };
        
        reader.readAsText(file);
    };

    return (
        <div className="space-y-4">
            <p>Upload a CSV file with mentee data. The file should have columns: <code>name</code>, <code>username</code>, <code>password</code>, <code>adno</code>, <code>class</code>, <code>mentor_username</code>.</p>
             <Input
                ref={fileInputRef}
                id="bulk-upload-csv"
                label="Mentee CSV File"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            <Button onClick={handleUpload} disabled={loading || !file}>
                {loading ? <><Spinner size="sm" color="white" className="mr-2"/> Processing...</> : 'Upload and Add Mentees'}
            </Button>
            
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

            {results && (
                <div className="mt-4 p-4 border rounded-md dark:border-gray-700">
                    <h4 className="font-semibold text-lg mb-2">Upload Report</h4>
                    {results.successes > 0 && (
                         <div className="p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-md mb-4">
                            <p className="font-semibold text-green-800 dark:text-green-300">Successfully added {results.successes} mentee(s).</p>
                        </div>
                    )}
                    {results.failures.length > 0 && (
                        <div>
                             <div className="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-md mb-2">
                                <p className="font-semibold text-red-800 dark:text-red-300">Failed to add {results.failures.length} mentee(s).</p>
                            </div>
                            <ul className="text-sm space-y-2 max-h-48 overflow-y-auto p-2 border rounded-md dark:border-gray-600">
                                {results.failures.map((failure, index) => (
                                    <li key={index}>
                                        <strong>Row {index + 2}:</strong> (User: {failure.data.username}) - <span className="text-red-500">{failure.error}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}


const TableRowSkeleton: React.FC = () => (
    <tr className="animate-pulse">
        <td className="px-6 py-4"><div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div></td>
        <td className="px-6 py-4"><div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-16"></div></td>
        <td className="px-6 py-4"><div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-24"></div></td>
    </tr>
);

export const SystemSettings: React.FC = () => {
    const [codes, setCodes] = useState<InvitationCode[]>([]);
    const [newCode, setNewCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const fetchCodes = async () => {
        // Only set loading true on initial fetch
        if (codes.length === 0) setLoading(true);
        const data = await SupabaseService.getInvitationCodes();
        setCodes(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchCodes();
    }, []);

    const handleAddCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCode) return;
        setSubmitting(true);
        await SupabaseService.addInvitationCode(newCode);
        setNewCode('');
        await fetchCodes();
        setSubmitting(false);
    };

    const handleToggleCode = async (code: string) => {
        await SupabaseService.toggleInvitationCode(code);
        await fetchCodes();
    }

    return (
        <div className="space-y-6">
            <Card title="Manage Mentor Invitation Codes">
                <form onSubmit={handleAddCode} className="flex items-end space-x-4 mb-6">
                    <div className="flex-grow">
                        <Input
                            id="new-code"
                            label="New Invitation Code"
                            value={newCode}
                            onChange={(e) => setNewCode(e.target.value)}
                            placeholder="e.g., FALL2024"
                        />
                    </div>
                    <Button type="submit" disabled={submitting}>
                        {submitting ? 'Adding...' : 'Add Code'}
                    </Button>
                </form>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">Code</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <>
                                    <TableRowSkeleton />
                                    <TableRowSkeleton />
                                </>
                            ) : codes.map(code => (
                                <tr key={code.code} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                    <td className="px-6 py-4 font-mono text-gray-900 dark:text-white">{code.code}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${code.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                                            {code.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Button variant="ghost" size="sm" onClick={() => handleToggleCode(code.code)}>
                                            {code.isActive ? 'Deactivate' : 'Activate'}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card title="Bulk Add Mentees">
                <BulkAddMentees />
            </Card>
        </div>
    );
};
