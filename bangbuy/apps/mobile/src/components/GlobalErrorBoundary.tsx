import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Updates from 'expo-updates';

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class GlobalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // This catches RENDER errors.
        console.error('[GlobalErrorBoundary] Caught render error:', error);
        console.error('[GlobalErrorBoundary] Component Stack:', errorInfo.componentStack);

        // Here you would also log to your crash reporting service (Sentry, etc.)
    }

    /**
     * Helper: Extract meaningful frame from stack
     */
    private extractProjectFrame(stack: string | undefined): string {
        if (!stack) return '(not found)';
        const lines = stack.split('\n');
        // Simple heuristic to find project code
        const projectLine = lines.find(line => line.includes('/app/') || line.includes('/src/'));
        return projectLine ? projectLine.trim() : lines[0]; // Fallback to first line
    }

    handleCopyError = async () => {
        const { error } = this.state;
        if (!error) return;

        const text = [
            `Error: ${error.name}: ${error.message}`,
            'Stack:',
            error.stack || '(no stack)',
        ].join('\n');

        try {
            await Clipboard.setStringAsync(text);
            Alert.alert('Copied', 'Error details copied to clipboard.');
        } catch (e) {
            Alert.alert('Failed', 'Could not copy error details.');
        }
    };

    handleRestart = async () => {
        try {
            await Updates.reloadAsync();
        } catch (error) {
            Alert.alert('Restart Failed', 'Please manually force quit and reopen the app.');
        }
    };

    render() {
        if (this.state.hasError) {
            const { error } = this.state;
            const firstFrame = this.extractProjectFrame(error?.stack);

            return (
                <View style={styles.container}>
                    <ScrollView contentContainerStyle={styles.content}>
                        <Text style={styles.icon}>⚠️</Text>
                        <Text style={styles.title}>Something went wrong</Text>
                        <Text style={styles.subtitle}>
                            We encountered an unexpected error.
                        </Text>

                        <View style={styles.card}>
                            <Text style={styles.label}>Error:</Text>
                            <Text style={styles.errorText}>{error?.message || 'Unknown Error'}</Text>

                            <Text style={styles.label}>Location:</Text>
                            <Text style={styles.codeText} numberOfLines={3}>
                                {firstFrame}
                            </Text>
                        </View>

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.button, styles.restartButton]}
                                onPress={this.handleRestart}
                            >
                                <Text style={styles.restartButtonText}>Restart App</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.copyButton]}
                                onPress={this.handleCopyError}
                            >
                                <Text style={styles.copyButtonText}>Copy Error Details</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 60,
    },
    content: {
        padding: 24,
        alignItems: 'center',
    },
    icon: {
        fontSize: 48,
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 32,
    },
    card: {
        width: '100%',
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 16,
        marginBottom: 32,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#888',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    errorText: {
        fontSize: 14,
        color: '#d32f2f',
        fontWeight: '500',
        marginBottom: 16,
    },
    codeText: {
        fontSize: 12,
        fontFamily: 'monospace',
        color: '#333',
        backgroundColor: '#e0e0e0',
        padding: 8,
        borderRadius: 4,
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
    },
    button: {
        width: '100%',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    restartButton: {
        backgroundColor: '#007AFF',
    },
    restartButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    copyButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    copyButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
});
