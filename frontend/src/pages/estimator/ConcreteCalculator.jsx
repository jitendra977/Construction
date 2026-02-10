import React, { useState } from 'react';
import { calculatorService } from '../../services/api';

const ConcreteCalculator = () => {
    const [formData, setFormData] = useState({
        length: '',
        width: '',
        thickness: '',
        grade: 'M20'
    });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleCalculate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const response = await calculatorService.calculateConcrete(formData);
            setResult(response.data);
        } catch (err) {
            setError("Failed to calculate. Please check inputs.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow mb-4">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Concrete (Dhalan) Estimator</h3>

            <form onSubmit={handleCalculate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Length (ft)</label>
                        <input
                            type="number"
                            name="length"
                            value={formData.length}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Width (ft)</label>
                        <input
                            type="number"
                            name="width"
                            value={formData.width}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Thickness (inch)</label>
                        <input
                            type="number"
                            name="thickness"
                            value={formData.thickness}
                            onChange={handleChange}
                            placeholder="e.g. 5 or 6"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Grade</label>
                        <select
                            name="grade"
                            value={formData.grade}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        >
                            <option value="M20">M20 (1:1.5:3) - Standard Slab</option>
                            <option value="M15">M15 (1:2:4) - PCC/Flooring</option>
                            <option value="M10">M10 (1:3:6) - Rough Base</option>
                        </select>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                >
                    {loading ? 'Calculating...' : 'Calculate'}
                </button>
            </form>

            {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}

            {result && (
                <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">Estimated Materials:</h4>
                    <p className="text-sm text-gray-500 mb-2">Total Volume: {result.volume_m3} m³ ({result.slab_area_sqft} sq.ft area)</p>

                    <div className="grid grid-cols-1 gap-3">
                        <div className="bg-white p-3 rounded shadow-sm flex justify-between items-center">
                            <span className="text-gray-600">Cement</span>
                            <span className="text-lg font-bold text-gray-800">{result.cement_bags} <span className="text-sm font-normal">bags</span></span>
                        </div>
                        <div className="bg-white p-3 rounded shadow-sm flex justify-between items-center">
                            <span className="text-gray-600">Sand</span>
                            <div className="text-right">
                                <span className="block text-lg font-bold text-yellow-600">{result.sand_cft} Cft</span>
                                <span className="block text-xs text-gray-400">{result.sand_m3} m³</span>
                            </div>
                        </div>
                        <div className="bg-white p-3 rounded shadow-sm flex justify-between items-center">
                            <span className="text-gray-600">Aggregate (Gitti)</span>
                            <div className="text-right">
                                <span className="block text-lg font-bold text-gray-700">{result.aggregate_cft} Cft</span>
                                <span className="block text-xs text-gray-400">{result.aggregate_m3} m³</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConcreteCalculator;
