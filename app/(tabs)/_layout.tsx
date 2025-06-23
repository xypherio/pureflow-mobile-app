import { Tabs } from 'expo-router'
import React from 'react'

const _layout = () => {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="forecast"
        options={{
          title: 'Forecast',
          headerShown: false,
        }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Notifications',
            headerShown: false,
          }}
        />
    </Tabs>
  )
}

export default _layout