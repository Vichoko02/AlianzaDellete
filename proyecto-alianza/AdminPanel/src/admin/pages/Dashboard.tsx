import { useState, useEffect } from 'react';
import { newsApi, projectsApi, usersApi, wikiApi } from '../../services/api';

interface Stats {
  totalUsers: number;
  totalProjects: number;
  totalWikis: number;
  totalNews: number;
}

const contar = (datos: unknown): number => (Array.isArray(datos) ? datos.length : 0);

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalProjects: 0, totalWikis: 0, totalNews: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [usersData, projectsData, wikisData, newsData] = await Promise.all([
        usersApi.getAll().catch(() => ({ total: 0 })),
        projectsApi.getAll().catch(() => []),
        wikiApi.getAll().catch(() => []),
        newsApi.getAll().catch(() => []),
      ]);
      setStats({
        totalUsers: usersData.total || 0,
        totalProjects: contar(projectsData),
        totalWikis: contar(wikisData),
        totalNews: contar(newsData),
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const tarjetas = [
    { valor: stats.totalProjects, etiqueta: 'Proyectos', color: 'red' },
    { valor: stats.totalWikis, etiqueta: 'Wikis', color: 'yellow' },
    { valor: stats.totalNews, etiqueta: 'Noticias', color: 'blue' },
    { valor: stats.totalUsers, etiqueta: 'Usuarios', color: 'green' },
  ];

  return (
    <div className="admin-content">
      <header className="admin-header">
        <h1 className="admin-header-title">Dashboard</h1>
      </header>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando...</div>
      ) : (
        <div className="admin-stats-grid">
          {tarjetas.map((t) => (
            <div className="admin-stat-card" key={t.etiqueta}>
              <div className={`admin-stat-icon ${t.color}`}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
                </svg>
              </div>
              <div className="admin-stat-content">
                <div className="admin-stat-value">{t.valor}</div>
                <div className="admin-stat-label">{t.etiqueta}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
