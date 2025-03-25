import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/src/constants/Styles';

export interface FaithTradition {
  id: string;
  name: string;
  description: string;
  ionicon: keyof typeof Ionicons.glyphMap;
  color: string;
  image?: ImageSourcePropType;
  prayerLabel: string;
  healingLabel: string;
}

export const FAITH_TRADITIONS: FaithTradition[] = [
  {
    id: 'secular',
    name: 'Secular',
    description: 'A non-religious, mindfulness-based approach',
    ionicon: 'leaf',
    color: COLORS.secondary,
    prayerLabel: 'Intention',
    healingLabel: 'Wellness',
  },
  {
    id: 'buddhist',
    name: 'Buddhist',
    description: 'Following the teachings of Buddha',
    ionicon: 'flower',
    color: '#FFA726',
    prayerLabel: 'Metta',
    healingLabel: 'Healing',
  },
  {
    id: 'christian',
    name: 'Christian',
    description: 'Following the teachings of Jesus Christ',
    ionicon: 'heart',
    color: '#EC407A',
    prayerLabel: 'Prayer',
    healingLabel: 'Divine Healing',
  },
  {
    id: 'hindu',
    name: 'Hindu',
    description: 'Following Sanātana Dharma',
    ionicon: 'infinite',
    color: '#FF7043',
    prayerLabel: 'Prarthana',
    healingLabel: 'Healing',
  },
  {
    id: 'jewish',
    name: 'Jewish',
    description: 'Following Judaism',
    ionicon: 'star',
    color: '#42A5F5',
    prayerLabel: 'Tefillah',
    healingLabel: 'Refuah',
  },
  {
    id: 'muslim',
    name: 'Muslim',
    description: 'Following Islam',
    ionicon: 'moon',
    color: '#66BB6A',
    prayerLabel: 'Dua',
    healingLabel: 'Shifa',
  },
  {
    id: 'spiritual',
    name: 'Spiritual',
    description: 'A personal spiritual practice',
    ionicon: 'sunny',
    color: '#8D6E63',
    prayerLabel: 'Intention',
    healingLabel: 'Energy Healing',
  },
  {
    id: 'other',
    name: 'Other',
    description: 'Other faith traditions',
    ionicon: 'grid',
    color: '#78909C',
    prayerLabel: 'Prayer',
    healingLabel: 'Healing',
  },
];

interface TraditionSelectorProps {
  selectedTradition: string;
  onSelectTradition: (traditionId: string) => void;
  showDescription?: boolean;
  compact?: boolean;
}

const TraditionSelector: React.FC<TraditionSelectorProps> = ({
  selectedTradition,
  onSelectTradition,
  showDescription = true,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(!compact);
  
  const selectedTraditionObj = FAITH_TRADITIONS.find(
    (t) => t.id === selectedTradition
  ) || FAITH_TRADITIONS[0];
  
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };
  
  const renderTraditionCard = (tradition: FaithTradition) => {
    const isSelected = tradition.id === selectedTradition;
    return (
      <TouchableOpacity
        key={tradition.id}
        style={[
          styles.traditionCard,
          isSelected && styles.selectedCard,
          { borderColor: tradition.color },
        ]}
        onPress={() => {
          onSelectTradition(tradition.id);
          if (compact) setExpanded(false);
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: tradition.color }]}>
          <Ionicons name={tradition.ionicon} size={24} color={COLORS.white} />
        </View>
        <View style={styles.traditionTextContainer}>
          <Text style={styles.traditionName}>{tradition.name}</Text>
          {showDescription && (
            <Text style={styles.traditionDescription} numberOfLines={2}>
              {tradition.description}
            </Text>
          )}
        </View>
        {isSelected && (
          <View style={styles.checkmarkContainer}>
            <Ionicons name="checkmark-circle" size={24} color={tradition.color} />
          </View>
        )}
      </TouchableOpacity>
    );
  };
  
  const renderCompactSelector = () => (
    <View style={styles.compactContainer}>
      <TouchableOpacity
        style={styles.selectedTraditionButton}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: selectedTraditionObj.color }]}>
          <Ionicons name={selectedTraditionObj.ionicon} size={24} color={COLORS.white} />
        </View>
        <View style={styles.selectedTextContainer}>
          <Text style={styles.selectedName}>{selectedTraditionObj.name}</Text>
          <Text style={styles.tapToChangeText}>Tap to change</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={COLORS.gray}
        />
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.expandedContainer}>
          <ScrollView
            style={styles.traditionsScrollContainer}
            contentContainerStyle={styles.traditionsScrollContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {FAITH_TRADITIONS.map(renderTraditionCard)}
          </ScrollView>
        </View>
      )}
    </View>
  );
  
  const renderExpandedGrid = () => (
    <ScrollView
      style={styles.traditionsScrollContainer}
      contentContainerStyle={styles.traditionsScrollContent}
      showsVerticalScrollIndicator={false}
    >
      {FAITH_TRADITIONS.map(renderTraditionCard)}
    </ScrollView>
  );
  
  return compact ? renderCompactSelector() : renderExpandedGrid();
};

const styles = StyleSheet.create({
  expandedContainer: {
    flex: 1,
    maxHeight: 400,
  },
  compactContainer: {
    width: '100%',
    marginVertical: 10,
  },
  selectedTraditionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  selectedName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  tapToChangeText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  traditionsScrollContainer: {
    maxHeight: 400,
  },
  traditionsScrollContent: {
    paddingBottom: 10,
  },
  traditionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedCard: {
    borderWidth: 2,
    backgroundColor: 'rgba(74, 111, 255, 0.05)',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
    overflow: 'hidden',
  },
  traditionTextContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  traditionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 2,
  },
  traditionDescription: {
    fontSize: 12,
    color: COLORS.gray,
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TraditionSelector;
