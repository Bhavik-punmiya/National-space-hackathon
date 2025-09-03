# 🎨 Frontend Reservation Integration

This document describes the reservation system integration in the SearchRetrieve component.

## ✨ Features Added

### 1. **Schedule Button**
- Added below the Retrieve button for each item
- Amber/orange colored button with calendar icon
- Opens the scheduling modal when clicked

### 2. **Schedule Modal**
- **Purpose Field**: Required text input for reservation purpose
- **Start/End Time**: DateTime pickers for scheduling
- **Priority Selection**: Dropdown with priority levels (10-90)
- **Notes Field**: Optional textarea for additional details
- **User ID**: Defaults to "astronaut_001" (can be enhanced later)

### 3. **Reservation Display**
- Shows currently scheduled reservations above item details
- Displays astronaut name, purpose, dates, times, and priority
- Amber-colored information box with detailed scheduling info

### 4. **Enhanced Retrieval Steps**
- Shows scheduling information for each step in the retrieval process
- Indicates if blocking items are already scheduled
- Displays who scheduled them and when

## 🔧 How It Works

### **Search Flow**
1. User searches for an item
2. Component fetches item details and any existing reservations
3. Displays item info with current scheduling status
4. Shows Schedule and Retrieve buttons

### **Scheduling Flow**
1. User clicks "Schedule" button
2. Modal opens with pre-filled item information
3. User fills in scheduling details
4. Form submits to `/api/reservations` endpoint
5. Success/error feedback via toast notifications
6. Reservation list refreshes automatically

### **Reservation Display**
- **Active Reservations**: Shows current and future bookings
- **Priority Levels**: Visual indicators for reservation importance
- **Time Details**: Start and end times in readable format
- **User Information**: Which astronaut made the reservation

## 🎯 UI Components

### **Schedule Modal**
```tsx
<ScheduleModal
  isOpen={showScheduleModal}
  onClose={() => setShowScheduleModal(false)}
  item={selectedItem}
  onSchedule={handleSchedule}
  isScheduling={isScheduling}
/>
```

### **Reservation Display**
```tsx
{activeReservations.length > 0 && (
  <div className="bg-amber-900/20 border border-amber-700/30 rounded-md">
    {/* Reservation details */}
  </div>
)}
```

### **Schedule Button**
```tsx
<button
  onClick={() => result.item && openScheduleModal(result.item)}
  className="bg-amber-600 hover:bg-amber-500 text-white"
>
  <Calendar size={16} />
  <span>Schedule</span>
</button>
```

## 📱 User Experience

### **Visual Design**
- **Color Scheme**: Amber/orange for scheduling-related elements
- **Icons**: Calendar and User icons for clear visual communication
- **Layout**: Clean, organized information display
- **Responsiveness**: Works on different screen sizes

### **Interaction Flow**
1. **Search** → Find item
2. **View** → See current scheduling status
3. **Schedule** → Open modal and fill details
4. **Confirm** → Submit and get feedback
5. **Update** → See updated reservation list

### **Error Handling**
- Network errors show user-friendly messages
- Form validation prevents invalid submissions
- Loading states provide clear feedback
- Toast notifications for success/error feedback

## 🔗 API Integration

### **Endpoints Used**
- `GET /api/reservations/item/{item_id}` - Fetch item reservations
- `POST /api/reservations` - Create new reservation

### **Data Flow**
1. **Fetch**: Get existing reservations when item is found
2. **Display**: Show current scheduling status
3. **Create**: Submit new reservation data
4. **Refresh**: Update display with new information

## 🚀 Future Enhancements

### **Planned Features**
- **User Authentication**: Real user management instead of hardcoded IDs
- **Reservation Management**: Edit/cancel existing reservations
- **Calendar View**: Visual calendar representation
- **Conflict Resolution**: Handle scheduling conflicts in UI
- **Notifications**: Real-time updates for reservation changes

### **UI Improvements**
- **Drag & Drop**: Visual scheduling interface
- **Timeline View**: Horizontal timeline of reservations
- **Filtering**: Search and filter reservations
- **Export**: Calendar integration (iCal, Google Calendar)

## 🧪 Testing

### **Manual Testing**
1. Search for an item
2. Click Schedule button
3. Fill out the form
4. Submit and verify success
5. Check if reservation appears in display

### **Test Scenarios**
- **Valid Scheduling**: Normal reservation creation
- **Time Conflicts**: Try to schedule overlapping times
- **Form Validation**: Submit with missing required fields
- **Network Errors**: Test with backend offline
- **Multiple Reservations**: Schedule multiple items

## 📝 Notes

### **Current Limitations**
- User ID is hardcoded to "astronaut_001"
- No reservation editing/cancellation in UI
- Basic error handling
- No real-time updates

### **Browser Compatibility**
- Uses modern HTML5 datetime-local inputs
- Requires JavaScript enabled
- Responsive design for mobile/desktop

### **Performance Considerations**
- Fetches reservations on each search
- Could be optimized with caching
- Modal re-renders on each open

## 🤝 Contributing

When adding new features to the reservation UI:
1. **Design First**: Plan the user experience
2. **Component Structure**: Keep components modular
3. **State Management**: Use React hooks effectively
4. **Error Handling**: Provide clear user feedback
5. **Testing**: Test on different devices/screen sizes
6. **Documentation**: Update this README

## 📞 Support

For issues with the frontend reservation integration:
1. Check browser console for errors
2. Verify backend API is running
3. Test with different items
4. Check network requests in DevTools
5. Verify environment variables are set correctly
