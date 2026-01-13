// Elementos del DOM
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        const calibrateBtn = document.getElementById('calibrateBtn');
        
        // Elementos de datos
        const accelerometerData = document.getElementById('accelerometerData');
        const gyroscopeData = document.getElementById('gyroscopeData');
        const orientationData = document.getElementById('orientationData');
        const lightData = document.getElementById('lightData');
        const shakeData = document.getElementById('shakeData');
        const sensorsList = document.getElementById('sensorsList');
        
        // Elementos de visualización
        const accelerationBall = document.getElementById('accelerationBall');
        const gyroscopeBall = document.getElementById('gyroscopeBall');
        const compassNeedle = document.getElementById('compassNeedle');
        const lightVisualization = document.getElementById('lightVisualization');
        const shakeIcon = document.getElementById('shakeIcon');
        
        // Elementos de estado
        const accelerometerStatus = document.getElementById('accelerometerStatus');
        const gyroscopeStatus = document.getElementById('gyroscopeStatus');
        const orientationStatus = document.getElementById('orientationStatus');
        const lightStatus = document.getElementById('lightStatus');
        const shakeStatus = document.getElementById('shakeStatus');
        const summaryStatus = document.getElementById('summaryStatus');
        
        // Variables de estado
        let sensorsActive = false;
        let calibrationOffset = 0;
        let lastShakeTime = 0;
        let shakeCount = 0;
        let lightSensor = null;
        
        // Umbral para detectar agitado
        const SHAKE_THRESHOLD = 15;
        
        // Inicialización de la aplicación
        document.addEventListener('DOMContentLoaded', () => {
            checkSensorsAvailability();
            setupEventListeners();
        });
        
        // Verificar disponibilidad de sensores
        function checkSensorsAvailability() {
            // Verificar Acelerómetro
            if (window.DeviceMotionEvent) {
                accelerometerStatus.textContent = "Disponible";
                accelerometerStatus.className = "sensor-status available";
            } else {
                accelerometerStatus.textContent = "No disponible";
                accelerometerStatus.className = "sensor-status unavailable";
            }
            
            // Verificar Giroscopio
            if (window.DeviceOrientationEvent) {
                gyroscopeStatus.textContent = "Disponible";
                gyroscopeStatus.className = "sensor-status available";
            } else {
                gyroscopeStatus.textContent = "No disponible";
                gyroscopeStatus.className = "sensor-status unavailable";
            }
            
            // Verificar Sensor de Luz Ambiental
            if ('AmbientLightSensor' in window) {
                lightStatus.textContent = "Disponible";
                lightStatus.className = "sensor-status available";
                lightData.textContent = "Listo para medir";
            } else {
                lightStatus.textContent = "No disponible";
                lightStatus.className = "sensor-status unavailable";
                lightData.textContent = "No disponible en este dispositivo";
            }
            
            // Actualizar resumen
            updateSensorsSummary();
        }
        
        // Configurar event listeners
        function setupEventListeners() {
            startBtn.addEventListener('click', startSensors);
            stopBtn.addEventListener('click', stopSensors);
            calibrateBtn.addEventListener('click', calibrateCompass);
        }
        
        // Iniciar todos los sensores
        function startSensors() {
            if (sensorsActive) return;
            
            // Solicitar permiso para acceder a los sensores (necesario en iOS)
            if (typeof DeviceMotionEvent.requestPermission === 'function') {
                DeviceMotionEvent.requestPermission()
                    .then(permissionState => {
                        if (permissionState === 'granted') {
                            activateSensors();
                        } else {
                            alert('Se necesitan permisos para acceder a los sensores.');
                        }
                    })
                    .catch(console.error);
            } else {
                // En Android y otros navegadores
                activateSensors();
            }
        }
        
        // Activar sensores después de obtener permisos
        function activateSensors() {
            sensorsActive = true;
            startBtn.disabled = true;
            stopBtn.disabled = false;
            
            // Acelerómetro
            window.addEventListener('devicemotion', handleAcceleration);
            
            // Orientación/Giroscopio
            window.addEventListener('deviceorientation', handleOrientation);
            
            // Sensor de luz ambiental (si está disponible)
            if ('AmbientLightSensor' in window) {
                try {
                    lightSensor = new AmbientLightSensor();
                    lightSensor.addEventListener('reading', () => {
                        handleLight(lightSensor.illuminance);
                    });
                    lightSensor.addEventListener('error', (event) => {
                        lightStatus.textContent = "Error";
                        lightStatus.className = "sensor-status unavailable";
                        lightData.textContent = "Error: " + event.error.message;
                    });
                    lightSensor.start();
                } catch (error) {
                    console.error('Error al iniciar el sensor de luz:', error);
                }
            }
            
            // Detector de agitado
            window.addEventListener('devicemotion', handleShake);
            
            // Actualizar estado
            updateSensorsSummary();
            summaryStatus.textContent = "Activo";
            
            // Mostrar mensaje
            showNotification("Sensores activados correctamente");
        }
        
        // Detener todos los sensores
        function stopSensors() {
            sensorsActive = false;
            startBtn.disabled = false;
            stopBtn.disabled = true;
            
            // Remover event listeners
            window.removeEventListener('devicemotion', handleAcceleration);
            window.removeEventListener('deviceorientation', handleOrientation);
            window.removeEventListener('devicemotion', handleShake);
            
            // Detener sensor de luz
            if (lightSensor) {
                lightSensor.stop();
                lightSensor = null;
            }
            
            // Restablecer visualizaciones
            accelerationBall.style.transform = 'translate(-50%, -50%)';
            gyroscopeBall.style.transform = 'translate(-50%, -50%)';
            compassNeedle.style.transform = 'translateX(-50%) rotate(0deg)';
            shakeIcon.classList.remove('shaking');
            
            // Restablecer datos
            accelerometerData.textContent = 'Detenido';
            gyroscopeData.textContent = 'Detenido';
            orientationData.textContent = 'Detenido';
            shakeData.textContent = 'En espera...';
            
            // Actualizar estado
            summaryStatus.textContent = "Detenido";
            
            // Mostrar mensaje
            showNotification("Sensores detenidos");
        }
        
        // Manejar datos del acelerómetro
        function handleAcceleration(event) {
            const acceleration = event.accelerationIncludingGravity;
            if (!acceleration) return;
            
            const x = acceleration.x || 0;
            const y = acceleration.y || 0;
            const z = acceleration.z || 0;
            
            // Actualizar datos numéricos
            accelerometerData.textContent = `X: ${x.toFixed(2)} | Y: ${y.toFixed(2)} | Z: ${z.toFixed(2)}`;
            
            // Actualizar visualización
            const maxAcceleration = 20; // Valor máximo para normalizar
            const normalizedX = (x / maxAcceleration) * 50;
            const normalizedY = (y / maxAcceleration) * 50;
            
            // Limitar el movimiento dentro del área de visualización
            const posX = Math.max(-70, Math.min(70, normalizedX));
            const posY = Math.max(-70, Math.min(70, normalizedY));
            
            accelerationBall.style.transform = `translate(calc(-50% + ${posX}px), calc(-50% + ${posY}px))`;
        }
        
        // Manejar datos de orientación/giroscopio
        function handleOrientation(event) {
            const alpha = event.alpha || 0; // Brújula (0-360)
            const beta = event.beta || 0;   // Inclinación frontal (-180 a 180)
            const gamma = event.gamma || 0; // Inclinación lateral (-90 a 90)
            
            // Actualizar datos numéricos
            orientationData.textContent = `α: ${alpha.toFixed(1)}° | β: ${beta.toFixed(1)}° | γ: ${gamma.toFixed(1)}°`;
            
            // Actualizar brújula
            const compassAngle = (360 - alpha + calibrationOffset) % 360;
            compassNeedle.style.transform = `translateX(-50%) rotate(${compassAngle}deg)`;
            
            // Actualizar datos del giroscopio
            gyroscopeData.textContent = `α: ${alpha.toFixed(1)}°/s | β: ${beta.toFixed(1)}°/s | γ: ${gamma.toFixed(1)}°/s`;
            
            // Actualizar visualización del giroscopio
            const maxRotation = 180;
            const normalizedBeta = (beta / maxRotation) * 70;
            const normalizedGamma = (gamma / maxRotation) * 70;
            
            // Limitar el movimiento dentro del área de visualización
            const posX = Math.max(-70, Math.min(70, normalizedGamma));
            const posY = Math.max(-70, Math.min(70, normalizedBeta));
            
            gyroscopeBall.style.transform = `translate(calc(-50% + ${posX}px), calc(-50% + ${posY}px))`;
        }
        
        // Manejar datos del sensor de luz
        function handleLight(illuminance) {
            if (!illuminance) return;
            
            // Actualizar datos
            lightData.textContent = `${illuminance.toFixed(0)} lux`;
            
            // Actualizar visualización
            let brightness = 'Oscuro';
            let bgColor = '#111';
            let textColor = '#FFF';
            
            if (illuminance < 10) {
                brightness = 'Muy oscuro';
                bgColor = '#111';
            } else if (illuminance < 50) {
                brightness = 'Oscuro';
                bgColor = '#333';
            } else if (illuminance < 100) {
                brightness = 'Poca luz';
                bgColor = '#666';
            } else if (illuminance < 1000) {
                brightness = 'Bien iluminado';
                bgColor = '#999';
                textColor = '#000';
            } else if (illuminance < 10000) {
                brightness = 'Muy iluminado';
                bgColor = '#CCC';
                textColor = '#000';
            } else {
                brightness = 'Luz intensa';
                bgColor = '#FFF';
                textColor = '#000';
            }
            
            lightVisualization.style.backgroundColor = bgColor;
            lightVisualization.style.color = textColor;
            lightVisualization.innerHTML = `<div class="light-visualization">${brightness}<br>${illuminance.toFixed(0)} lux</div>`;
        }
        
        // Detectar agitado del dispositivo
        function handleShake(event) {
            const acceleration = event.accelerationIncludingGravity;
            if (!acceleration) return;
            
            const x = acceleration.x || 0;
            const y = acceleration.y || 0;
            const z = acceleration.z || 0;
            
            // Calcular la aceleración total
            const totalAcceleration = Math.sqrt(x*x + y*y + z*z);
            
            // Detectar agitado
            const currentTime = new Date().getTime();
            const timeDiff = currentTime - lastShakeTime;
            
            if (totalAcceleration > SHAKE_THRESHOLD && timeDiff > 1000) {
                lastShakeTime = currentTime;
                shakeCount++;
                
                // Actualizar datos
                shakeData.textContent = `¡Agitado! (${shakeCount} veces)`;
                
                // Animación
                shakeIcon.classList.add('shaking');
                setTimeout(() => {
                    shakeIcon.classList.remove('shaking');
                }, 500);
                
                // Mostrar notificación
                showNotification(`¡Dispositivo agitado! (${shakeCount})`);
            }
        }
        
        // Calibrar brújula (establecer norte actual)
        function calibrateCompass() {
            if (!sensorsActive) {
                showNotification("Primero activa los sensores");
                return;
            }
            
            // En una aplicación real, aquí se usaría la lectura actual como referencia
            // Para este ejemplo, simulamos una calibración
            calibrationOffset = Math.random() * 360;
            showNotification("Brújula calibrada. Norte establecido.");
            
            // Simular calibración
            calibrateBtn.disabled = true;
            calibrateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calibrando...';
            
            setTimeout(() => {
                calibrateBtn.disabled = false;
                calibrateBtn.innerHTML = '<i class="fas fa-compass"></i> Calibrar Brújula';
                showNotification("Calibración completada");
            }, 1500);
        }
        
        // Actualizar resumen de sensores disponibles
        function updateSensorsSummary() {
            const sensors = [];
            
            if (window.DeviceMotionEvent) {
                sensors.push("Acelerómetro (3 ejes con gravedad)");
            }
            
            if (window.DeviceOrientationEvent) {
                sensors.push("Giroscopio/Orientación (alpha, beta, gamma)");
            }
            
            if ('AmbientLightSensor' in window) {
                sensors.push("Sensor de Luz Ambiental (lux)");
            }
            
            if ('ProximitySensor' in window) {
                sensors.push("Sensor de Proximidad");
            }
            
            if ('Magnetometer' in window) {
                sensors.push("Magnetómetro (campo magnético)");
            }
            
            if ('LinearAccelerationSensor' in window) {
                sensors.push("Aceleración Lineal (sin gravedad)");
            }
            
            if ('GravitySensor' in window) {
                sensors.push("Sensor de Gravedad");
            }
            
            if (sensors.length === 0) {
                sensors.push("No se detectaron sensores compatibles");
            }
            
            // Actualizar lista
            sensorsList.innerHTML = '';
            sensors.forEach(sensor => {
                const li = document.createElement('li');
                li.textContent = sensor;
                li.style.marginBottom = '8px';
                sensorsList.appendChild(li);
            });
            
            // Actualizar contador
            summaryStatus.textContent = `${sensors.length} sensores`;
        }
        
        // Mostrar notificación temporal
        function showNotification(message) {
            // Crear elemento de notificación
            const notification = document.createElement('div');
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #0fce7c;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                z-index: 1000;
                font-weight: 600;
                animation: slideIn 0.3s ease-out;
            `;
            
            document.body.appendChild(notification);
            
            // Eliminar después de 3 segundos
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 3000);
            
            // Añadir estilos de animación si no existen
            if (!document.querySelector('#notification-styles')) {
                const style = document.createElement('style');
                style.id = 'notification-styles';
                style.textContent = `
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes slideOut {
                        from { transform: translateX(0); opacity: 1; }
                        to { transform: translateX(100%); opacity: 0; }
                    }
                `;
                document.head.appendChild(style);
            }
        }
        
        // Información sobre los sensores disponibles
        console.log("Aplicación de sensores móviles cargada");
        console.log("Dispositivo soporta DeviceMotionEvent:", !!window.DeviceMotionEvent);
        console.log("Dispositivo soporta DeviceOrientationEvent:", !!window.DeviceOrientationEvent);
        console.log("Dispositivo soporta AmbientLightSensor:", 'AmbientLightSensor' in window);