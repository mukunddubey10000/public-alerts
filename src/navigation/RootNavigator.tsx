import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import HomeScreen from "../screens/HomeScreen";

const Stack = createStackNavigator();

const RootNavigator = () => {
	return (
		<Stack.Navigator
			initialRouteName="Home"
			screenOptions={{
				headerShown: false,
				cardStyle: { backgroundColor: "#f5f5f5" },
			}}
		>
			<Stack.Screen name="Home" component={HomeScreen} />
		</Stack.Navigator>
	);
};

export default RootNavigator;
