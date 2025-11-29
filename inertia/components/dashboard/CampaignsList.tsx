import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { ChevronDown, ChevronRight, Mail, Layers } from 'lucide-react'

interface CampaignsListProps {
  campaigns: Array<{ campaignId: number; campaignName: string; count: number }>
  stages: Array<{
    campaignId: number
    campaignName: string
    stageId: number
    stageName: string
    count: number
  }>
}

export default function CampaignsList({ campaigns, stages }: CampaignsListProps) {
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<number>>(new Set())

  const toggleCampaign = (campaignId: number) => {
    const newExpanded = new Set(expandedCampaigns)
    if (newExpanded.has(campaignId)) {
      newExpanded.delete(campaignId)
    } else {
      newExpanded.add(campaignId)
    }
    setExpandedCampaigns(newExpanded)
  }

  // Agrupar etapas por campaña
  const stagesByCampaign = new Map<number, Array<{
    stageId: number
    stageName: string
    count: number
  }>>()

  stages.forEach((stage) => {
    if (!stagesByCampaign.has(stage.campaignId)) {
      stagesByCampaign.set(stage.campaignId, [])
    }
    stagesByCampaign.get(stage.campaignId)!.push({
      stageId: stage.stageId,
      stageName: stage.stageName,
      count: stage.count,
    })
  })

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Envíos por Campaña y Etapa</CardTitle>
      </CardHeader>
      <CardContent>
        {campaigns.length > 0 ? (
          <div className="space-y-2">
            {campaigns.map((campaign) => {
              const campaignStages = stagesByCampaign.get(campaign.campaignId) || []
              const isExpanded = expandedCampaigns.has(campaign.campaignId)

              return (
                <div key={campaign.campaignId} className="border rounded-lg overflow-hidden">
                  {/* Header de la campaña */}
                  <button
                    onClick={() => toggleCampaign(campaign.campaignId)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="flex items-center justify-center w-6 h-6">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                      </div>
                      <Mail className="h-5 w-5 text-blue-600" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{campaign.campaignName}</h3>
                        <p className="text-sm text-gray-500">
                          {campaignStages.length} {campaignStages.length === 1 ? 'etapa' : 'etapas'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Total de envíos</p>
                        <p className="text-lg font-bold text-blue-600">{campaign.count.toLocaleString()}</p>
                      </div>
                    </div>
                  </button>

                  {/* Etapas de la campaña (expandible) */}
                  {isExpanded && campaignStages.length > 0 && (
                    <div className="bg-gray-50 border-t">
                      <div className="p-4 space-y-2">
                        {campaignStages.map((stage) => (
                          <div
                            key={stage.stageId}
                            className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <Layers className="h-4 w-4 text-gray-400" />
                              <div>
                                <p className="font-medium text-gray-900">{stage.stageName}</p>
                                <p className="text-xs text-gray-500">Etapa ID: {stage.stageId}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-700">
                                {stage.count.toLocaleString()} {stage.count === 1 ? 'envío' : 'envíos'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mensaje si no hay etapas */}
                  {isExpanded && campaignStages.length === 0 && (
                    <div className="bg-gray-50 border-t p-4">
                      <p className="text-sm text-gray-500 text-center">
                        Esta campaña no tiene etapas configuradas
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No hay campañas configuradas
          </div>
        )}
      </CardContent>
    </Card>
  )
}

