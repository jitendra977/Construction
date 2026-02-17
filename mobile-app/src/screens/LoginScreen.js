import React, { useState, memo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Dimensions,
    ImageBackground
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { User, Lock, ArrowRight, LayoutDashboard } from 'lucide-react-native';

const { width } = Dimensions.get('window');

// Memoized background component to prevent re-renders
const Background = memo(({ children }) => (
    <LinearGradient
        colors={['#059669', '#047857', '#064e3b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
    >
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.inner}
        >
            {children}
        </KeyboardAvoidingView>
    </LinearGradient>
));

// Separate Form component to isolate state changes
const LoginForm = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!username || !password) {
            Alert.alert('Error', 'Please enter username and password');
            return;
        }

        setLoading(true);

        try {
            const result = await login(username, password);
            if (!result.success) {
                Alert.alert('Login Failed', result.error || 'Please check your credentials');
            }
        } catch (error) {
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            if (mounted.current) {
                setLoading(false);
            }
        }
    };

    // Use ref to track mount state
    const mounted = React.useRef(true);
    React.useEffect(() => {
        return () => { mounted.current = false; };
    }, []);

    return (
        <View style={styles.contentContainer}>
            <View style={styles.header}>
                <View style={styles.iconCircle}>
                    <LayoutDashboard color="#059669" size={40} />
                </View>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to Mero Ghar Construction</Text>
            </View>

            <View style={styles.card}>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Username</Text>
                    <View style={styles.inputWrapper}>
                        <User color="#9ca3af" size={20} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="username"
                            placeholderTextColor="#d1d5db"
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.inputWrapper}>
                        <Lock color="#9ca3af" size={20} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor="#d1d5db"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={true}
                        />
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.forgotButton}
                    onPress={() => Alert.alert('Support', 'Please contact admin to reset password')}
                >
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleLogin}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <Text style={styles.buttonText}>Sign In</Text>
                            <ArrowRight color="white" size={20} />
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <Text style={styles.footerText}>Version 1.0.0 • Secured by SSL</Text>
        </View>
    );
};

export default function LoginScreen() {
    return (
        <Background>
            <LoginForm />
        </Background>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    inner: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    contentContainer: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#a7f3d0',
        textAlign: 'center',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.15,
        shadowRadius: 25,
        elevation: 10,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        backgroundColor: '#f9fafb',
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1f2937',
    },
    forgotButton: {
        alignSelf: 'flex-end',
        marginBottom: 24,
    },
    forgotText: {
        color: '#059669',
        fontSize: 14,
        fontWeight: '500',
    },
    button: {
        backgroundColor: '#059669',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    footerText: {
        marginTop: 40,
        textAlign: 'center',
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
    },
});
