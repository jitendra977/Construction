import React, { useState } from 'react';
import { calculatorService } from '../../services/api';

const BrickCalculator = () => {
    const [formData, setFormData] = useState({
        length: '',
        height: '',
        thickness: '9_INCH',
        ratio: '1:6'
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
            const response = await calculatorService.calculateWall(formData);
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
            <h3 className="text-lg font-bold mb-4 text-gray-800">Brick Wall Estimator</h3>

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
                        <label className="block text-sm font-medium text-gray-700">Height (ft)</label>
                        <input
                            type="number"
                            name="height"
                            value={formData.height}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Thickness</label>
                        <select
                            name="thickness"
                            value={formData.thickness}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        >
                            <option value="9_INCH">9 inch (External)</option>
                            <option value="4_INCH">4.5 inch (Partition)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Mortar Ratio</label>
                        <select
                            name="ratio"
                            value={formData.ratio}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        >
                            <option value="1:6">1:6 (Strong)</option>
                            <option value="1:5">1:5</option>
                            <option value="1:4">1:4 (Very Strong)</option>
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
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded shadow-sm">
                            <p className="text-xs text-gray-500">Bricks</p>
                            <p className="text-xl font-bold text-red-600">{result.bricks} <span className="text-sm font-normal text-gray-600">pcs</span></p>
                        </div>
                        <div className="bg-white p-3 rounded shadow-sm">
                            <p className="text-xs text-gray-500">Cement</p>
                            <p className="text-xl font-bold text-gray-800">{result.cement_bags} <span className="text-sm font-normal text-gray-600">bags</span></p>
                        </div>
                        <div className="bg-white p-3 rounded shadow-sm col-span-2">
                            <p className="text-xs text-gray-500">Sand</p>
                            <div className="flex justify-between items-baseline">
                                <p className="text-xl font-bold text-yellow-600">{result.sand_cft} <span className="text-sm font-normal text-gray-600">Cft</span></p>
                                <p className="text-sm text-gray-500">({result.sand_m3} m³)</p>
                            </div>
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-400 text-center">Based on standard Nepali brick size (230x110x55mm) with 10mm mortar.</p>
                </div>
            )}
        </div>
    );
};

export default BrickCalculator;
