package com.mypk2.drogueria_eka_app.ui.scanner

import androidx.annotation.OptIn
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage

/**
 * BarcodeAnalyzer — Analiza cada frame de la cámara para detectar códigos de barras
 * Usa ML Kit on-device (sin internet) para detectar Code128, EAN13, QR
 * Cooldown de 2s entre detecciones para evitar dobles
 */
class BarcodeAnalyzer(
    private val onBarcodeDetected: (String) -> Unit
) : ImageAnalysis.Analyzer {

    private val scanner = BarcodeScanning.getClient()
    private var lastDetectionTime = 0L
    private val cooldownMs = 2000L // 2 segundos entre detecciones

    @OptIn(ExperimentalGetImage::class)
    override fun analyze(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage == null) {
            imageProxy.close()
            return
        }

        val now = System.currentTimeMillis()
        if (now - lastDetectionTime < cooldownMs) {
            imageProxy.close()
            return
        }

        val inputImage = InputImage.fromMediaImage(
            mediaImage,
            imageProxy.imageInfo.rotationDegrees
        )

        scanner.process(inputImage)
            .addOnSuccessListener { barcodes ->
                for (barcode in barcodes) {
                    val rawValue = barcode.rawValue
                    if (!rawValue.isNullOrEmpty()) {
                        lastDetectionTime = System.currentTimeMillis()
                        onBarcodeDetected(rawValue)
                        break // Solo procesar el primer código detectado
                    }
                }
            }
            .addOnCompleteListener {
                imageProxy.close()
            }
    }
}
