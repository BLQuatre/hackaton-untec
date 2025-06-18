import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface LocationData {
  nom_ville: string | null;
  population: number | null;
  superficie_km2: number | null;
  densite: number | null;
  nbr_unemployed: number | null;
  job_offers: number | null;
}

interface ChartComponentProps {
  data: LocationData;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function ChartComponent({ data }: ChartComponentProps) {
  const barData = [
    {
      name: 'Population',
      value: data.population || 0,
      color: '#0088FE'
    },
    {
      name: 'Unemployed',
      value: data.nbr_unemployed || 0,
      color: '#FF8042'
    },
    {
      name: 'Job Offers',
      value: data.job_offers || 0,
      color: '#00C49F'
    }
  ];

  const pieData = [
    {
      name: 'Employed',
      value: (data.population || 0) - (data.nbr_unemployed || 0),
      color: '#00C49F'
    },
    {
      name: 'Unemployed',
      value: data.nbr_unemployed || 0,
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
    </div>
  );
}
