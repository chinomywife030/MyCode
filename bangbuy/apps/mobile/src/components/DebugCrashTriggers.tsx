import React from 'react';
import { View, Button, StyleSheet, Alert } from 'react-native';

export const DebugCrashTriggers = () => {
    const triggerRenderError = () => {
        // This will be caught by GlobalErrorBoundary
        const BuggyComponent = () => {
            throw new Error('Test Render Error Triggered!');
        };
        // Force a re-render with the buggy component (simulated for simplicity by alerting user this would normally need state toggle)
        // To actually test, we can just throw here if it was inside the render phase.
        // But since we are in an event handler, we need to force a render error.
        // A simple way is to set state that conditionally renders the BuggyComponent.
        Alert.alert('Usage', 'To test render error, you need to integrate this component such that it conditionally renders a throwing child.');
    };

    const throwRenderError = () => {
        // In strict mode, event handlers don't trip Error Boundaries. 
        // We must throw inside the render phase.
        // This function is just a placeholder. 
        // The real test component needs internal state.
    };

    return (
        <View style={styles.container}>
            <CrashTester />
        </View>
    );
};

// Internal component to manage state for throwing
const CrashTester = () => {
    const [shouldThrow, setShouldThrow] = React.useState(false);

    if (shouldThrow) {
        throw new Error('Simulated Render Error');
    }

    const handleAsyncError = async () => {
        console.log('Triggering Async Promise Rejection...');
        new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error('Simulated Async Promise Rejection'));
            }, 100);
        });
    };

    const handleUndefinedFunction = () => {
        console.log('Triggering Undefined Function...');
        // @ts-ignore
        const forbidden = undefined;
        // @ts-ignore
        forbidden();
    };

    return (
        <View style={styles.buttons}>
            <Button
                title="Trigger Render Error"
                onPress={() => setShouldThrow(true)}
                color="#FFA500"
            />
            <View style={{ height: 10 }} />
            <Button
                title="Trigger Async Error (Promise)"
                onPress={handleAsyncError}
                color="#FF4444"
            />
            <View style={{ height: 10 }} />
            <Button
                title="Trigger Undefined Function"
                onPress={handleUndefinedFunction}
                color="#8B0000"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#eee',
        borderRadius: 8,
        marginVertical: 10,
    },
    buttons: {
        flexDirection: 'column',
    }
});
