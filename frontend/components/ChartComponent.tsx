import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface LocationData {
  nom_ville: string | null;
  population: number | null;
  superficie_km2: number | null;
  densite: number | null;
  nbr_unemployed: number | null;
  job_offers: number | null;
}

interface EnhancedLocationData {
  nom_ville: string;
  population: number;
  superficie_km2: number;
  densite: number;
  Unemployed_people?: number;
  Job_Offer_in_Departement?: number;
  Shop_nbr?: number;
  "Food Store_nbr"?: number;
  Healthcare_nbr?: number;
  "Public Services_nbr"?: number;
  School_nbr?: number;
  Transport_nbr?: number;

  // Scoring data
  Score_Travail?: string;
  Score_Transport?: string;
  "Score_Service public"?: string;
  "Score_Éducation"?: string;
  Score_Commerce?: string;
  "Score_Santé"?: string;
  Score_Global?: string;
}

interface ChartComponentProps {
  data: LocationData | EnhancedLocationData | string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export function ChartComponent({ data }: ChartComponentProps) {
  // Handle case where data might be a string (error message)
  if (!data || typeof data !== 'object') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Unable to display chart: {typeof data === 'string' ? data : 'Invalid data format'}</p>
      </div>
    );
  }

  // Helper function to check if data is enhanced
  const isEnhanced = (data: any): data is EnhancedLocationData => {
    return data && typeof data === 'object' && ('Unemployed_people' in data || 'Job_Offer_in_Departement' in data);
  };

  const unemployedCount = isEnhanced(data) ? (data.Unemployed_people || 0) : (data.nbr_unemployed || 0);
  const jobOffersCount = isEnhanced(data) ? (data.Job_Offer_in_Departement || 0) : (data.job_offers || 0);

  const barData = [
    {
      name: 'Population',
      value: data.population || 0,
      color: '#0088FE'
    },
    {
      name: 'Unemployed',
      value: unemployedCount,
      color: '#FF8042'
    },
    {
      name: 'Job Offers',
      value: jobOffersCount,
      color: '#00C49F'
    }
  ];

  // Add amenities data for enhanced charts
  if (isEnhanced(data)) {
    const amenitiesData = [
      { name: 'Shops', value: data.Shop_nbr || 0 },
      { name: 'Food Stores', value: data["Food Store_nbr"] || 0 },
      { name: 'Healthcare', value: data.Healthcare_nbr || 0 },
      { name: 'Schools', value: data.School_nbr || 0 },
      { name: 'Transport', value: data.Transport_nbr || 0 },
      { name: 'Public Services', value: data["Public Services_nbr"] || 0 },
    ].filter(item => item.value > 0);

    if (amenitiesData.length > 0) {
      barData.push(...amenitiesData.map((item, index) => ({
        name: item.name,
        value: item.value,
        color: COLORS[3 + (index % 3)]
      })));
    }
  }

  const pieData = [
    {
      name: 'Employed',
      value: Math.max(0, (data.population || 0) - unemployedCount),
      color: '#00C49F'
    },
    {
      name: 'Unemployed',
      value: unemployedCount,
      color: '#FF8042'
    }
  ];

  const densityData = [
    {
      name: data.nom_ville,
      density: data.densite || 0,
      area: data.superficie_km2 || 0
    }
  ];

  // Scores data for enhanced visualization
  const scoresData = isEnhanced(data) ? [
    { name: 'Work', score: parseFloat(data.Score_Travail?.replace('/100', '') || '0'), color: '#10B981' },
    { name: 'Transport', score: parseFloat(data.Score_Transport?.replace('/100', '') || '0'), color: '#F59E0B' },
    { name: 'Public Services', score: parseFloat(data["Score_Service public"]?.replace('/100', '') || '0'), color: '#8B5CF6' },
    { name: 'Education', score: parseFloat(data["Score_Éducation"]?.replace('/100', '') || '0'), color: '#3B82F6' },
    { name: 'Commerce', score: parseFloat(data.Score_Commerce?.replace('/100', '') || '0'), color: '#EC4899' },
    { name: 'Health', score: parseFloat(data["Score_Santé"]?.replace('/100', '') || '0'), color: '#EF4444' }
  ].filter(item => item.score > 0) : [];

  return (
    <div className="space-y-6">
      {/* Employment Overview */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Employment Overview</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Population vs Employment</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [value.toLocaleString(), '']} />
                <Bar dataKey="value" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Employment Distribution</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value.toLocaleString(), '']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Density Analysis */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">City Metrics</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={densityData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="density" fill="#FFBB28" name="Density (per km²)" />
            <Bar dataKey="area" fill="#00C49F" name="Area (km²)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Scores Analysis - New Section */}
      {isEnhanced(data) && scoresData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Quality of Life Scores</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scores Bar Chart */}
            <div>
              <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Category Scores (out of 100)</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scoresData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" width={80} />
                  <Tooltip formatter={(value) => [`${value}/100`, 'Score']} />
                  <Bar dataKey="score" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Global Score Display */}
            {data.Score_Global && (
              <div className="flex flex-col justify-center items-center">
                <h4 className="text-sm font-medium mb-4 text-gray-700 dark:text-gray-300">Overall Score</h4>
                <div className="relative w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Score', value: parseFloat(data.Score_Global.replace('/100', '') || '0'), color: '#10B981' },
                          { name: 'Remaining', value: 100 - parseFloat(data.Score_Global.replace('/100', '') || '0'), color: '#E5E7EB' }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={60}
                        startAngle={90}
                        endAngle={450}
                        dataKey="value"
                      >
                        <Cell fill="#10B981" />
                        <Cell fill="#E5E7EB" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {data.Score_Global}
                      </div>
                      <div className="text-xs text-gray-500">Global</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
