import { json } from '@sveltejs/kit';
import db from '$lib/db';

export async function GET({ url }) {
    const q = url.searchParams.get('q');
    if (!q || q.length < 2) return json([]);

    try {
        // Query នេះនឹង Join ៤ តារាង ដើម្បីយកឈ្មោះ ភូមិ ឃុំ ស្រុក ខេត្ត
        const query = `
            SELECT 
                a.id, 
                a.khmer_name, 
                a.type,
                p1.khmer_name AS parent_name,
                p2.khmer_name AS grand_parent_name,
                p3.khmer_name AS province_name
            FROM addresses AS a
            LEFT JOIN addresses AS p1 ON a.sub_of = p1.id
            LEFT JOIN addresses AS p2 ON p1.sub_of = p2.id
            LEFT JOIN addresses AS p3 ON p2.sub_of = p3.id
            WHERE a.khmer_name LIKE ?
            LIMIT 15
        `;
        
        const [rows] = await db.execute(query, [`%${q}%`]);
        return json(rows);
    } catch (error) {
        return json({ error: 'Database error' }, { status: 500 });
    }
}