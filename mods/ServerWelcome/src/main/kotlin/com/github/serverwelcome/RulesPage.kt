package com.github.serverwelcome

import com.hypixel.hytale.codec.Codec
import com.hypixel.hytale.codec.KeyedCodec
import com.hypixel.hytale.codec.builder.BuilderCodec
import com.hypixel.hytale.component.Ref
import com.hypixel.hytale.component.Store
import com.hypixel.hytale.protocol.packets.interface_.CustomPageLifetime
import com.hypixel.hytale.protocol.packets.interface_.CustomUIEventBindingType
import com.hypixel.hytale.server.core.entity.entities.player.pages.InteractiveCustomUIPage
import com.hypixel.hytale.server.core.ui.builder.EventData as UiEventData
import com.hypixel.hytale.server.core.ui.builder.UICommandBuilder
import com.hypixel.hytale.server.core.ui.builder.UIEventBuilder
import com.hypixel.hytale.server.core.universe.PlayerRef
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore
import java.util.function.BiConsumer
import java.util.function.Function
import java.util.function.Supplier

/** Окно правил (тот же стиль карточки, что у YooKassa / WorldProtect). */
class RulesPage(
    playerRef: PlayerRef,
    private val subtitle: String,
    private val rulesText: String,
) : InteractiveCustomUIPage<RulesPage.CloseEventData>(
    playerRef,
    CustomPageLifetime.CanDismissOrCloseThroughInteraction,
    CloseEventData.CODEC,
) {
    override fun build(
        ref: Ref<EntityStore>,
        commands: UICommandBuilder,
        events: UIEventBuilder,
        store: Store<EntityStore>,
    ) {
        commands.append(PAGE)
        commands.set("#Subtitle.Text", subtitle)
        commands.set("#RulesBody.Text", rulesText)

        val close = UiEventData().append("Action", "close")
        events.addEventBinding(CustomUIEventBindingType.Activating, "#CloseButton", close)
        events.addEventBinding(CustomUIEventBindingType.Activating, "#OkButton", close)
    }

    override fun handleDataEvent(ref: Ref<EntityStore>, store: Store<EntityStore>, data: CloseEventData) {
        if (data.action == "close") {
            close()
        }
    }

    class CloseEventData {
        @JvmField
        var action: String? = null

        companion object {
            @JvmField
            val CODEC: BuilderCodec<CloseEventData> =
                BuilderCodec.builder(CloseEventData::class.java, Supplier { CloseEventData() })
                    .append(
                        KeyedCodec("Action", Codec.STRING),
                        BiConsumer { d: CloseEventData, v: String? -> d.action = v },
                        Function { it.action },
                    )
                    .add()
                    .build()
        }
    }

    companion object {
        private const val PAGE = "Pages/ServerWelcome/RulesPage.ui"
    }
}
