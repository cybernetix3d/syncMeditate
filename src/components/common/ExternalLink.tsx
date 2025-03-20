import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Text } from './Themed';

export default function ExternalLink(props: any) {
  return <Link {...props} style={[styles.link, props.style]} />;
}

const styles = StyleSheet.create({
  link: {
    color: '#2e78b7',
  },
}); 