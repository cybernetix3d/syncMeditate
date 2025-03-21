import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/Styles';

interface SimpleDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  mode: 'date' | 'time';
  label?: string;
}

const SimpleDatePicker: React.FC<SimpleDatePickerProps> = ({ 
  value, 
  onChange, 
  mode, 
  label 
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  
  // Format the date based on the mode
  const getDisplayText = () => {
    if (mode === 'date') {
      return value.toLocaleDateString();
    } else {
      return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };
  
  // Date picker options
  const generateDateOptions = () => {
    const today = new Date();
    const options = [];
    
    // Add today
    options.push({
      label: 'Today',
      value: new Date()
    });
    
    // Add next 14 days
    for (let i = 1; i <= 14; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      options.push({
        label: `${date.toLocaleDateString()} (${i === 1 ? 'Tomorrow' : `+${i} days`})`,
        value: date
      });
    }
    
    return options;
  };
  
  // Time picker options (every 15 mins)
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const date = new Date(value);
        date.setHours(hour, minute, 0, 0);
        
        // Format time
        const formattedTime = date.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        });
        
        options.push({
          label: formattedTime,
          value: date
        });
      }
    }
    return options;
  };
  
  const handleSelect = (selectedDate: Date) => {
    // Preserve time when selecting a date, and vice versa
    let newDate = new Date(value);
    
    if (mode === 'date') {
      newDate.setFullYear(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      );
    } else {
      newDate.setHours(
        selectedDate.getHours(),
        selectedDate.getMinutes(),
        0,
        0
      );
    }
    
    onChange(newDate);
    setModalVisible(false);
  };
  
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity 
        style={[styles.pickerButton, mode === 'date' ? styles.dateButton : styles.timeButton]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons 
          name={mode === 'date' ? 'calendar-outline' : 'time-outline'} 
          size={24} 
          color={COLORS.primary} 
        />
        <Text style={styles.pickerText}>{getDisplayText()}</Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
      </TouchableOpacity>
      
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select {mode === 'date' ? 'Date' : 'Time'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.optionsContainer}>
              {(mode === 'date' ? generateDateOptions() : generateTimeOptions()).map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.optionItem}
                  onPress={() => handleSelect(option.value)}
                >
                  <Text style={styles.optionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: COLORS.darkGray,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B8D8E1', // Light blue color
    borderRadius: 8,
    padding: 16,
    minHeight: 60,
  },
  dateButton: {
    width: 120, // Fixed width for date button
    marginRight: 8,
  },
  timeButton: {
    flex: 1, // Fill remaining space for time button
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: COLORS.darkGray,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  closeButton: {
    padding: 4,
  },
  optionsContainer: {
    maxHeight: 400,
  },
  optionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  optionText: {
    fontSize: 16,
    color: COLORS.darkGray,
  },
});

export default SimpleDatePicker; 