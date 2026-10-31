package com.mypk2.drogueria_eka_app.ui.asistente

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import com.mypk2.drogueria_eka_app.data.model.ChatMessage
import com.mypk2.drogueria_eka_app.databinding.FragmentChatIaBinding
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class ChatIaFragment : Fragment() {

    private var _binding: FragmentChatIaBinding? = null
    private val binding get() = _binding!!
    private val viewModel: ChatIaViewModel by viewModels()
    private lateinit var adapter: ChatAdapter

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentChatIaBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        adapter = ChatAdapter()
        binding.rvChat.adapter = adapter

        binding.btnSend.setOnClickListener {
            val text = binding.etMessage.text.toString()
            if (text.isNotBlank()) {
                viewModel.sendMessage(text)
                binding.etMessage.text.clear()
            }
        }

        viewModel.messages.observe(viewLifecycleOwner) { msgs ->
            if (msgs.size > adapter.itemCount) {
                for (i in adapter.itemCount until msgs.size) {
                    adapter.addMessage(msgs[i])
                }
                binding.rvChat.smoothScrollToPosition(msgs.size - 1)
            }
        }

        viewModel.isLoading.observe(viewLifecycleOwner) { loading ->
            binding.progressBar.visibility = if (loading) View.VISIBLE else View.GONE
            binding.btnSend.isEnabled = !loading
        }

        viewModel.error.observe(viewLifecycleOwner) { err ->
            err?.let {
                Toast.makeText(requireContext(), it, Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
