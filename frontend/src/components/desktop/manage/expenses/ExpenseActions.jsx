import React from 'react';

const ExpenseActions = ({ searchQuery, setSearchQuery, handleOpenModal }) => {
    return (
        <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center mb-8">
            <div className="relative w-full md:w-96 group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors duration-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </span>
                <input
                    type="text"
                    placeholder="Search title, paid to, category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white/70 backdrop-blur-md border border-gray-100 rounded-2xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-medium shadow-sm"
                />
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
                <button
                    onClick={() => handleOpenModal()}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 active:scale-95 font-bold transition-all shadow-lg shadow-indigo-100"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    New Expense
                </button>
            </div>
        </div>
    );
};

export default ExpenseActions;
