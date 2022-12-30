import { UiConfig } from '../types'
import Player, { isMobile } from '@oplayer/core'
import { canplay, clamp, formatTime } from '../utils'

const FULL_SLIDE_DURATION = 60

export default function (player: Player, $dom: HTMLDivElement, config: UiConfig) {
  if (isMobile && !player.options.isLive && config.slideToSeek && config.slideToSeek != 'none') {
    player.on(
      canplay,
      () => {
        let startX = 0
        let startY = 0
        let touchedTime = 0
        let shouldSeekSec = 0
        let touchedTimer: number
        const rect = player.$root.getBoundingClientRect()

        if (config.slideToSeek == 'always') {
          $dom.addEventListener('touchstart', (e) => {
            startX = (<TouchEvent>e).changedTouches[0]!.clientX
            startY = (<TouchEvent>e).changedTouches[0]!.clientY
          })
          $dom.addEventListener('touchmove', moving)
          $dom.addEventListener('touchend', end)
        }

        if (config.slideToSeek == 'long-touch') {
          $dom.addEventListener('touchstart', (e) => {
            startX = (<TouchEvent>e).changedTouches[0]!.clientX
            touchedTimer = window.setInterval(() => {
              touchedTime += 100
              if (touchedTime >= 1000) {
                clearInterval(touchedTimer)
                //左右滑动可以调整进度
                player.emit('notice', { text: 'slid left or right to seek' })
                $dom.addEventListener('touchmove', moving)
              }
            }, 100)

            $dom.addEventListener('touchend', end, { once: true })
          })
        }

        function moving(e: TouchEvent) {
          e.preventDefault()
          const x = (<TouchEvent>e).changedTouches[0]!.clientX - rect.left
          const y = (<TouchEvent>e).changedTouches[0]!.clientX - rect.top
          const dx = x - startX
          const dy = startY - y

          // if (Math.abs(dx) + Math.abs(dy) < 4) return
          const angle = getSlideAngle(dx, dy)
          if (
            (angle >= -45 && angle < 45) ||
            (angle >= 135 && angle <= 180) ||
            (angle >= -180 && angle < -135)
          ) {
            shouldSeekSec = (FULL_SLIDE_DURATION * dx) / rect.width

            player.emit('notice', {
              text: `${formatTime(
                clamp(player.currentTime + shouldSeekSec, 0, player.duration)
              )} / ${formatTime(player.duration)}`
            })
          }
        }

        function end() {
          if (config.slideToSeek == 'long-touch' && touchedTime < 1000) {
            if (touchedTimer) clearInterval(touchedTimer)
            $dom.removeEventListener('touchmove', moving)
          }
          if (Math.abs(shouldSeekSec) >= 1) {
            player.seek(clamp(player.currentTime + shouldSeekSec, 0, player.duration))
          }
          startX = startY = shouldSeekSec = touchedTime = 0
        }
      },
      { once: true }
    )
  }
}

function getSlideAngle(dx: number, dy: number) {
  return (Math.atan2(dy, dx) * 180) / Math.PI
}