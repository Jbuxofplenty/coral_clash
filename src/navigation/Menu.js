import { DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer";
import { Block, Text } from "galio-framework";
import React from "react";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function CustomDrawerContent(props) {
  const insets = useSafeAreaInsets();
  
  return (
    <DrawerContentScrollView {...props} style={styles.container}>
      <Block style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text h4 color="white" style={styles.title}>
          Coral Clash
        </Text>
        <Text size={14} color="white" style={styles.subtitle}>
          Ocean Strategy Game
        </Text>
      </Block>
      
      <Block style={styles.drawerItems}>
        <DrawerItemList {...props} />
      </Block>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#1e3c72',
    paddingHorizontal: 24,
    paddingBottom: 24,
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    opacity: 0.8,
  },
  drawerItems: {
    flex: 1,
    paddingTop: 10,
  },
});

export default CustomDrawerContent;
