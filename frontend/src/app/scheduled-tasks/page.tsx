"use client";
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface Reservation {
  reservation_id: string;
  item_id: string;
  user_id: string;
  user_name: string;
  purpose: string;
  start_time: string;
  end_time: string;
  status: string;
  priority: number;
  notes?: string;
}

export default function ScheduledTasksPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{username: string, userId: string} | null>(null);

  // Load current user from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("space_user");
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setCurrentUser({ username: userData.username, userId: userData.userId });
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("space_user");
        router.push('/signin');
      }
    } else {
      router.push('/signin');
    }
  }, [router]);

  // Fetch user's reservations
  useEffect(() => {
    if (currentUser?.userId) {
      fetchUserReservations();
    }
  }, [currentUser]);

  const fetchUserReservations = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/api/reservations/user/${currentUser?.userId}`);
      
      if (response.ok) {
        const data = await response.json();
        setReservations(data.reservations || []);
      } else {
        console.error('Failed to fetch reservations');
        toast.error('Failed to load scheduled tasks');
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast.error('Failed to load scheduled tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteReservation = async (reservationId: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/api/reservations/${reservationId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Task completed successfully!');
        fetchUserReservations(); // Refresh the list
      } else {
        toast.error('Failed to complete task');
      }
    } catch (error) {
      console.error('Error completing reservation:', error);
      toast.error('Failed to complete task');
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/api/reservations/${reservationId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Task cancelled successfully!');
        fetchUserReservations(); // Refresh the list
      } else {
        toast.error('Failed to cancel task');
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      toast.error('Failed to cancel task');
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 75) return 'bg-red-600 text-white';
    if (priority >= 50) return 'bg-yellow-600 text-white';
    return 'bg-green-600 text-white';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-600 text-white';
      case 'COMPLETED':
        return 'bg-blue-600 text-white';
      case 'CANCELLED':
        return 'bg-gray-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading scheduled tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to Home</span>
            </button>
            <div className="h-8 w-px bg-gray-700"></div>
            <div className="flex items-center space-x-3">
              <Calendar size={32} className="text-indigo-400" />
              <div>
                <h1 className="text-3xl font-bold text-white">Scheduled Tasks</h1>
                <p className="text-gray-400">Manage your scheduled inventory tasks</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-2xl font-bold text-white">{reservations.length}</div>
            <div className="text-gray-400 text-sm">Total Tasks</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-400">
              {reservations.filter(r => r.status === 'ACTIVE').length}
            </div>
            <div className="text-gray-400 text-sm">Active Tasks</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">
              {reservations.filter(r => r.status === 'COMPLETED').length}
            </div>
            <div className="text-gray-400 text-sm">Completed</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-400">
              {reservations.filter(r => r.status === 'CANCELLED').length}
            </div>
            <div className="text-gray-400 text-sm">Cancelled</div>
          </div>
        </div>

        {/* Reservations List */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Your Scheduled Tasks</h2>
          </div>
          
          {reservations.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar size={48} className="text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No scheduled tasks</h3>
              <p className="text-gray-500">You haven't scheduled any inventory tasks yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {reservations.map((reservation) => (
                <div key={reservation.reservation_id} className="p-6 hover:bg-gray-750 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-lg font-medium text-white">
                          Item: {reservation.item_id}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(reservation.status)}`}>
                          {reservation.status}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(reservation.priority)}`}>
                          Priority: {reservation.priority}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="flex items-center space-x-2 text-gray-400 mb-1">
                            <User size={16} />
                            <span className="text-sm">Scheduled by</span>
                          </div>
                          <p className="text-white">{reservation.user_name}</p>
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-2 text-gray-400 mb-1">
                            <Calendar size={16} />
                            <span className="text-sm">Purpose</span>
                          </div>
                          <p className="text-white">{reservation.purpose}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="flex items-center space-x-2 text-gray-400 mb-1">
                            <Clock size={16} />
                            <span className="text-sm">Start Time</span>
                          </div>
                          <p className="text-white">
                            {new Date(reservation.start_time).toLocaleDateString()} {new Date(reservation.start_time).toLocaleTimeString()}
                          </p>
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-2 text-gray-400 mb-1">
                            <Clock size={16} />
                            <span className="text-sm">End Time</span>
                          </div>
                          <p className="text-white">
                            {new Date(reservation.end_time).toLocaleDateString()} {new Date(reservation.end_time).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      
                      {reservation.notes && (
                        <div className="mb-4">
                          <div className="text-gray-400 text-sm mb-1">Notes</div>
                          <p className="text-gray-300 italic">{reservation.notes}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    {reservation.status === 'ACTIVE' && (
                      <div className="flex flex-col space-y-2 ml-4">
                        <button
                          onClick={() => handleCompleteReservation(reservation.reservation_id)}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                        >
                          <CheckCircle size={16} />
                          <span>Complete</span>
                        </button>
                        <button
                          onClick={() => handleCancelReservation(reservation.reservation_id)}
                          className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                        >
                          <XCircle size={16} />
                          <span>Cancel</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
