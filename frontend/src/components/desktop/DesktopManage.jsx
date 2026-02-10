import React, { useState } from 'react';
import { dashboardService, constructionService } from '../../services/api';
import Modal from '../common/Modal';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ContractorsTab from './manage/ContractorsTab';
import SuppliersTab from './manage/SuppliersTab';
import MaterialsTab from './manage/MaterialsTab';
import StockTab from './manage/StockTab';
import { useConstruction } from '../../context/ConstructionContext';

const DesktopManage = () => {
    const { dashboardData, refreshData } = useConstruction();
    const [activeTab, setActiveTab] = useState('phases');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [loading, setLoading] = useState(false);

    // Form states
    const [formData, setFormData] = useState({});

    const tabs = [
        { id: 'phases', label: 'Construction Phases' },
        { id: 'floors', label: 'Floors' },
        { id: 'rooms', label: 'Rooms' },
        { id: 'categories', label: 'Budget Categories' },
        { id: 'expenses', label: 'Expenses' },
        { id: 'suppliers', label: 'Suppliers' },
        { id: 'contractors', label: 'Contractors' },
        { id: 'materials', label: 'Materials' },
        { id: 'stock', label: 'Stock Mgr' },
    ];

    const handleOpenModal = (item = null) => {
        setEditingItem(item);
        if (item) {
            setFormData(item);
        } else {
            if (activeTab === 'rooms') setFormData({ floor: dashboardData.floors[0]?.id });
            else if (activeTab === 'expenses') setFormData({ category: dashboardData.budgetCategories[0]?.id, date: new Date().toISOString().split('T')[0], expense_type: 'MATERIAL' });
            else setFormData({});
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        const labels = {
            phases: 'Phase',
            floors: 'Floor',
            rooms: 'Room',
            categories: 'Category',
            expenses: 'Expense'
        };
        if (!window.confirm(`Are you sure you want to delete this ${labels[activeTab]}?`)) return;

        try {
            if (activeTab === 'phases') await constructionService.deletePhase(id);
            else if (activeTab === 'floors') await dashboardService.deleteFloor(id);
            else if (activeTab === 'rooms') await dashboardService.deleteRoom(id);
            else if (activeTab === 'categories') await dashboardService.deleteBudgetCategory(id);
            else if (activeTab === 'expenses') await dashboardService.deleteExpense(id);

            refreshData();
        } catch (error) {
            console.error("Delete failed", error);
            alert("Delete failed. This item might be linked to other records.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let dataToSubmit = { ...formData };

            // Sanitize foreign keys: convert empty strings to null for backend validation
            const foreignKeys = ['supplier', 'contractor', 'material', 'room', 'phase', 'category'];
            foreignKeys.forEach(key => {
                if (dataToSubmit[key] === '') {
                    dataToSubmit[key] = null;
                }
            });

            if (activeTab === 'phases') {
                if (editingItem) await constructionService.updatePhase(editingItem.id, dataToSubmit);
                else await constructionService.createPhase(dataToSubmit);
            } else if (activeTab === 'floors') {
                if (editingItem) await dashboardService.updateFloor(editingItem.id, dataToSubmit);
                else await dashboardService.createFloor(dataToSubmit);
            } else if (activeTab === 'rooms') {
                if (editingItem) await dashboardService.updateRoom(editingItem.id, dataToSubmit);
                else await dashboardService.createRoom(dataToSubmit);
            } else if (activeTab === 'categories') {
                if (editingItem) await dashboardService.updateBudgetCategory(editingItem.id, dataToSubmit);
                else await dashboardService.createBudgetCategory(dataToSubmit);
            } else if (activeTab === 'expenses') {
                if (editingItem) await dashboardService.updateExpense(editingItem.id, dataToSubmit);
                else await dashboardService.createExpense(dataToSubmit);
            }

            setIsModalOpen(false);
            refreshData();
        } catch (error) {
            console.error("Save failed", error);
            const backendError = error.response?.data
                ? Object.entries(error.response.data)
                    .map(([key, val]) => `${key}: ${val}`)
                    .join(', ')
                : "Please check your data.";
            alert(`Save failed: ${backendError}`);
        } finally {
            setLoading(false);
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = dashboardData.phases.findIndex((p) => p.id === active.id);
            const newIndex = dashboardData.phases.findIndex((p) => p.id === over.id);

            const newPhases = arrayMove(dashboardData.phases, oldIndex, newIndex);

            // Map new order based on index
            const orderUpdate = newPhases.map((phase, index) => ({
                id: phase.id,
                order: index + 1
            }));

            try {
                await constructionService.reorderPhases(orderUpdate);
                refreshData(); // Refresh to get the updated order from backend
            } catch (error) {
                console.error("Reorder failed", error);
                alert("Failed to update order. Please try again.");
            }
        }
    };

    const SortableRow = ({ phase }) => {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
        } = useSortable({ id: phase.id });

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            zIndex: isDragging ? 100 : 'auto',
            position: 'relative',
            backgroundColor: isDragging ? '#f9fafb' : 'transparent',
        };

        return (
            <tr ref={setNodeRef} style={style} className={`hover:bg-gray-50 transition-colors ${isDragging ? 'shadow-lg' : ''}`}>
                <td className="px-6 py-4 font-medium text-gray-900 cursor-move" {...attributes} {...listeners}>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400">☰</span>
                        {phase.order}
                    </div>
                </td>
                <td className="px-6 py-4 text-gray-700">{phase.name}</td>
                <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${phase.status === 'COMPLETED' ? 'bg-green-50 text-green-700' :
                        phase.status === 'IN_PROGRESS' ? 'bg-indigo-50 text-indigo-700' :
                            'bg-gray-50 text-gray-500'
                        }`}>
                        {phase.status}
                    </span>
                </td>
                <td className="px-6 py-4 text-gray-700">Rs. {Number(phase.estimated_budget).toLocaleString()}</td>
                <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => handleOpenModal(phase)} className="text-indigo-600 hover:text-indigo-900 font-medium text-sm">Edit</button>
                    <button onClick={() => handleDelete(phase.id)} className="text-red-600 hover:text-red-900 font-medium text-sm">Delete</button>
                </td>
            </tr>
        );
    };

    const renderPhasesTable = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Order</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Estimated Budget</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        <SortableContext
                            items={dashboardData.phases.map(p => p.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {dashboardData.phases.map(p => (
                                <SortableRow key={p.id} phase={p} />
                            ))}
                        </SortableContext>
                    </tbody>
                </table>
            </DndContext>
        </div>
    );


    const renderFloorsTable = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Level</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Rooms Count</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {dashboardData.floors.map(f => (
                        <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900">{f.level}</td>
                            <td className="px-6 py-4 text-gray-700">{f.name}</td>
                            <td className="px-6 py-4 text-gray-700">{f.rooms?.length || 0}</td>
                            <td className="px-6 py-4 text-right space-x-2">
                                <button onClick={() => handleOpenModal(f)} className="text-indigo-600 hover:text-indigo-900 font-medium text-sm">Edit</button>
                                <button onClick={() => handleDelete(f.id)} className="text-red-600 hover:text-red-900 font-medium text-sm">Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderCategoriesTable = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Allocation</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {dashboardData.budgetCategories?.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900">{c.name}</td>
                            <td className="px-6 py-4 text-gray-700">Rs. {Number(c.allocation).toLocaleString()}</td>
                            <td className="px-6 py-4 text-right space-x-2">
                                <button onClick={() => handleOpenModal(c)} className="text-indigo-600 hover:text-indigo-900 font-medium text-sm">Edit</button>
                                <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-900 font-medium text-sm">Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderExpensesTable = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Title</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Category</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Amount</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Paid To</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {dashboardData.expenses.map(e => (
                        <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900">{e.title}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${e.expense_type === 'MATERIAL' ? 'bg-blue-100 text-blue-700' :
                                    e.expense_type === 'LABOR' ? 'bg-orange-100 text-orange-700' :
                                        e.expense_type === 'FEES' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                    {e.expense_type || 'Material'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-gray-700">
                                <span className="px-2 py-1 bg-gray-100 rounded text-xs">{e.category_name}</span>
                            </td>
                            <td className="px-6 py-4 text-red-600 font-medium">Rs. {Number(e.amount).toLocaleString()}</td>
                            <td className="px-6 py-4 text-gray-700 text-sm">{e.paid_to || '-'}</td>
                            <td className="px-6 py-4 text-gray-500 text-sm">{new Date(e.date).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-right space-x-2">
                                <button onClick={() => handleOpenModal(e)} className="text-indigo-600 hover:text-indigo-900 font-medium text-sm">Edit</button>
                                <button onClick={() => handleDelete(e.id)} className="text-red-600 hover:text-red-900 font-medium text-sm">Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );



    const renderRoomsTable = () => (
        <div className="space-y-6">
            {dashboardData.floors.map(floor => {
                const floorRooms = dashboardData.rooms.filter(r => r.floor === floor.id);
                return (
                    <div key={floor.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800">{floor.name}</h3>
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-600">
                                {floorRooms.length} Rooms
                            </span>
                        </div>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white border-b border-gray-100">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Room Name</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {floorRooms.length > 0 ? (
                                    floorRooms.map(r => (
                                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900">{r.name}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${r.status === 'COMPLETED' ? 'bg-green-50 text-green-700' :
                                                    r.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700' :
                                                        'bg-gray-50 text-gray-500'
                                                    }`}>
                                                    {r.status === 'NOT_STARTED' ? 'Not Started' :
                                                        r.status === 'IN_PROGRESS' ? 'In Progress' : 'Completed'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button onClick={() => handleOpenModal(r)} className="text-indigo-600 hover:text-indigo-900 font-medium text-sm">Edit</button>
                                                <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:text-red-900 font-medium text-sm">Delete</button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-8 text-center text-gray-400 italic">
                                            No rooms on this floor yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                );
            })}
        </div>
    );







    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Project Management</h2>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={() => handleOpenModal()}
                    className={`px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm ${['suppliers', 'contractors', 'materials', 'stock'].includes(activeTab) ? 'hidden' : ''
                        }`}
                >
                    + Add {
                        activeTab === 'phases' ? 'Phase' :
                            activeTab === 'floors' ? 'Floor' :
                                activeTab === 'rooms' ? 'Room' :
                                    activeTab === 'categories' ? 'Category' :
                                        activeTab === 'expenses' ? 'Expense' : 'Item'
                    }
                </button>
            </div>

            {activeTab === 'phases' && renderPhasesTable()}
            {activeTab === 'floors' && renderFloorsTable()}
            {activeTab === 'rooms' && renderRoomsTable()}
            {activeTab === 'categories' && renderCategoriesTable()}
            {activeTab === 'expenses' && renderExpensesTable()}
            {activeTab === 'suppliers' && <SuppliersTab suppliers={dashboardData.suppliers} refreshData={refreshData} />}
            {activeTab === 'contractors' && <ContractorsTab contractors={dashboardData.contractors} refreshData={refreshData} />}
            {activeTab === 'materials' && <MaterialsTab materials={dashboardData.materials} refreshData={refreshData} />}
            {activeTab === 'stock' && <StockTab
                transactions={dashboardData.transactions}
                materials={dashboardData.materials}
                suppliers={dashboardData.suppliers}
                rooms={dashboardData.rooms}
                refreshData={refreshData}
            />}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`${editingItem ? 'Edit' : 'Add'} ${activeTab === 'phases' ? 'Phase' :
                    activeTab === 'floors' ? 'Floor' :
                        activeTab === 'rooms' ? 'Room' :
                            activeTab === 'categories' ? 'Category' :
                                activeTab === 'expenses' ? 'Expense' :
                                    activeTab === 'suppliers' ? 'Supplier' :
                                        activeTab === 'contractors' ? 'Contractor' :
                                            activeTab === 'materials' ? 'Material' :
                                                activeTab === 'stock' ? 'Stock Entry' : 'Supplier'
                    }`}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {activeTab === 'phases' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phase Name</label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                                    <input
                                        type="number"
                                        value={formData.order || 0}
                                        onChange={e => setFormData({ ...formData, order: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Budget</label>
                                    <input
                                        type="number"
                                        value={formData.estimated_budget || 0}
                                        onChange={e => setFormData({ ...formData, estimated_budget: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={formData.status || 'PENDING'}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                >
                                    <option value="PENDING">Pending</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="HALTED">Halted</option>
                                </select>
                            </div>
                        </>
                    )}

                    {activeTab === 'rooms' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Room Name</label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                                    <select
                                        value={formData.floor || ''}
                                        onChange={e => setFormData({ ...formData, floor: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                        required
                                    >
                                        <option value="">Select Floor</option>
                                        {dashboardData.floors.map(f => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Area (sqft)</label>
                                    <input
                                        type="number"
                                        value={formData.area_sqft || ''}
                                        onChange={e => setFormData({ ...formData, area_sqft: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        value={formData.status || 'NOT_STARTED'}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                    >
                                        <option value="NOT_STARTED">Not Started (Suru Bhayena)</option>
                                        <option value="IN_PROGRESS">In Progress (Kaam Hudai Cha)</option>
                                        <option value="COMPLETED">Completed (Sakiya)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Budget Allocation</label>
                                    <input
                                        type="number"
                                        value={formData.budget_allocation || 0}
                                        onChange={e => setFormData({ ...formData, budget_allocation: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'floors' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Floor Name</label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Level (0=Ground, 1=First...)</label>
                                <input
                                    type="number"
                                    value={formData.level || 0}
                                    onChange={e => setFormData({ ...formData, level: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                    required
                                />
                            </div>
                        </>
                    )}

                    {activeTab === 'categories' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Allocation Budget</label>
                                <input
                                    type="number"
                                    value={formData.allocation || 0}
                                    onChange={e => setFormData({ ...formData, allocation: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                    required
                                />
                            </div>
                        </>
                    )}

                    {activeTab === 'expenses' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Expense Title</label>
                                    <input
                                        type="text"
                                        value={formData.title || ''}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Expense Type</label>
                                    <select
                                        value={formData.expense_type || 'MATERIAL'}
                                        onChange={e => setFormData({ ...formData, expense_type: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                        required
                                    >
                                        <option value="MATERIAL">Material Purchase</option>
                                        <option value="LABOR">Labor/Worker Payment</option>
                                        <option value="FEES">Professional Fees</option>
                                        <option value="GOVT">Government/Permit Fees</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                                    <input
                                        type="number"
                                        value={formData.amount || 0}
                                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={formData.date || ''}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <select
                                        value={formData.category || ''}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                        required
                                    >
                                        <option value="">Select Category</option>
                                        {dashboardData.budgetCategories?.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {formData.expense_type === 'MATERIAL' ? 'Supplier' : (formData.expense_type === 'LABOR' || formData.expense_type === 'FEES' ? 'Contractor' : 'Paid To (Vendor)')}
                                    </label>
                                    {formData.expense_type === 'MATERIAL' ? (
                                        <select
                                            value={formData.supplier || ''}
                                            onChange={e => {
                                                const s = dashboardData.suppliers?.find(sup => sup.id === parseInt(e.target.value));
                                                setFormData({ ...formData, supplier: e.target.value, paid_to: s ? s.name : formData.paid_to });
                                            }}
                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                        >
                                            <option value="">Select Supplier</option>
                                            {dashboardData.suppliers?.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    ) : (formData.expense_type === 'LABOR' || formData.expense_type === 'FEES') ? (
                                        <select
                                            value={formData.contractor || ''}
                                            onChange={e => {
                                                const c = dashboardData.contractors?.find(con => con.id === parseInt(e.target.value));
                                                setFormData({ ...formData, contractor: e.target.value, paid_to: c ? c.name : formData.paid_to });
                                            }}
                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                        >
                                            <option value="">Select Contractor</option>
                                            {dashboardData.contractors?.map(c => (
                                                <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={formData.paid_to || ''}
                                            onChange={e => setFormData({ ...formData, paid_to: e.target.value })}
                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                            placeholder="Who was paid?"
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phase</label>
                                    <select
                                        value={formData.phase || ''}
                                        onChange={e => setFormData({ ...formData, phase: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                    >
                                        <option value="">Select Phase</option>
                                        {dashboardData.phases.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                {['MATERIAL', 'LABOR', 'FEES'].includes(formData.expense_type) && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Paid To (Display Name)</label>
                                        <input
                                            type="text"
                                            value={formData.paid_to || ''}
                                            onChange={e => setFormData({ ...formData, paid_to: e.target.value })}
                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    )}





                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div >
    );
};

export default DesktopManage;
